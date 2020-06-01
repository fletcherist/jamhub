package main

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"os"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"golang.org/x/crypto/acme/autocert"

	"net/http"

	"bytes"
	"errors"
	"math/rand"
	"strconv"
	"strings"
)

var (
	errChanClosed     = errors.New("channel closed")
	errInvalidTrack   = errors.New("track is nil")
	errInvalidPacket  = errors.New("packet is nil")
	errNotImplemented = errors.New("not implemented")
)

const millisInSecond = 1000
const nsInSecond = 1000000

// FromUnixMilli Converts Unix Epoch from milliseconds to time.Time
func FromUnixMilli(ms int64) time.Time {
	return time.Unix(ms/int64(millisInSecond), (ms%int64(millisInSecond))*int64(nsInSecond))
}

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second
	// Time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second
	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10
	// Maximum message size allowed from peer.
	maxMessageSize = 51200
)

var (
	newline = []byte{'\n'}
	space   = []byte{' '}
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// Rooms is a set of rooms
type Rooms struct {
	rooms map[string]*Room
}

var errNotFound = errors.New("not found")

// Get room by room id
func (r *Rooms) Get(roomID string) (*Room, error) {
	if room, exists := r.rooms[roomID]; exists {
		return room, nil
	}
	return nil, errNotFound
}

// GetOrCreate creates room if it does not exist
func (r *Rooms) GetOrCreate(roomID string) *Room {
	room, err := r.Get(roomID)
	if err == nil {
		return room
	}
	newRoom := NewRoom(roomID)
	r.AddRoom(roomID, newRoom)
	go newRoom.run()
	return newRoom

}

// AddRoom adds room to rooms list
func (r *Rooms) AddRoom(roomID string, room *Room) error {
	if _, exists := r.rooms[roomID]; exists {
		return errors.New("room with id " + roomID + " already exists")
	}
	r.rooms[roomID] = room
	return nil
}

// RemoveRoom remove room from rooms list
func (r *Rooms) RemoveRoom(roomID string) error {
	if _, exists := r.rooms[roomID]; exists {
		delete(r.rooms, roomID)
		return nil
	}
	return nil
}

// RoomsStats is an app global statistics
type RoomsStats struct {
	Online int         `json:"online"`
	Rooms  []*RoomWrap `json:"rooms"`
}

// GetStats get app statistics
func (r *Rooms) GetStats() RoomsStats {
	stats := RoomsStats{
		Rooms: []*RoomWrap{},
	}
	for _, room := range r.rooms {
		stats.Online += room.GetUsersCount()
		stats.Rooms = append(stats.Rooms, room.Wrap(nil))
	}
	return stats
}

// NewRooms creates rooms instance
func NewRooms() *Rooms {
	return &Rooms{
		rooms: make(map[string]*Room, 100),
	}
}

// User is a middleman between the websocket connection and the hub.
type User struct {
	ID   string
	room *Room
	conn *websocket.Conn // The websocket connection.
	send chan []byte     // Buffered channel of outbound messages.

	closed bool
	info   UserInfo
}

// UserInfo contains some user data
type UserInfo struct {
	Name string `json:"name"` // emoji-face like on clients (for test)
	Mute bool   `json:"mute"`
}

// UserWrap represents user object sent to client
type UserWrap struct {
	ID string `json:"id"`
	UserInfo
}

// Wrap wraps user
func (u *User) Wrap() *UserWrap {
	return &UserWrap{
		ID:       u.ID,
		UserInfo: u.info,
	}
}

// readPump pumps messages from the websocket connection to the hub.
func (u *User) readPump() {
	defer func() {
		u.closed = true
		u.room.Leave(u)
		u.conn.Close()
	}()
	u.conn.SetReadLimit(maxMessageSize)
	u.conn.SetReadDeadline(time.Now().Add(pongWait))
	u.conn.SetPongHandler(func(string) error { u.conn.SetReadDeadline(time.Now().Add(pongWait)); return nil })
	for {
		_, message, err := u.conn.ReadMessage()
		if err != nil {
			log.Println(err)
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
				log.Println(err)
			}
			break
		}
		message = bytes.TrimSpace(bytes.Replace(message, newline, space, -1))
		go func() {
			err := u.HandleEvent(message)
			if err != nil {
				log.Println(err)
				u.SendErr(err)
			}
		}()
	}
}

// writePump pumps messages from the hub to the websocket connection.
//
// A goroutine running writePump is started for each connection. The
// application ensures that there is at most one writer to a connection by
// executing all writes from this goroutine.
func (u *User) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		u.closed = true
		u.conn.Close()
	}()
	for {
		select {
		case message, ok := <-u.send:
			u.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// The hub closed the channel.
				u.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			w, err := u.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)
			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			u.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := u.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// Event represents web socket user event
type Event struct {
	Type       string    `json:"type"`
	UserID     string    `json:"userId"`
	Instrument string    `json:"instrument,omitempty"`
	MIDI       *[]int64  `json:"midi,omitempty"`
	User       *UserWrap `json:"user,omitempty"`
	Room       *RoomWrap `json:"room,omitempty"`
	Desc       string    `json:"desc,omitempty"`
	Value      int64     `json:"value"`
}

// HandleEvent handles user event
func (u *User) HandleEvent(eventRaw []byte) error {
	var event *Event
	err := json.Unmarshal(eventRaw, &event)
	if err != nil {
		return err
	}
	// u.log("handle event:", event.Type)
	event.UserID = u.ID
	if event.Type == "ping" {
		pingTimestamp := FromUnixMilli(event.Value)
		pingToServer := time.Now().Sub(pingTimestamp)
		pingToServerMs := int64(math.Abs(float64(pingToServer.Milliseconds())))
		// fmt.Println("PING MS:", pingToServerMs)
		u.SendPingEvent(pingToServerMs)
		u.BroadcastEventPing(pingToServerMs)
		return nil
	} else if event.Type == "midi" {
		u.SendEvent(*event)
		u.BroadcastEvent(*event)
		return nil
	} else if event.Type == "mute" {
		u.info.Mute = true
		u.BroadcastEventMute()
		return nil
	} else if event.Type == "unmute" {
		u.info.Mute = false
		u.BroadcastEventUnmute()
		return nil
	}
	return u.SendErr(errNotImplemented)
}

// SendEvent sends json body to web socket
func (u *User) SendEvent(event Event) error {
	if u.closed == true { // user already disconnected
		return nil
	}
	json, err := json.Marshal(event)
	if err != nil {
		return err
	}
	u.send <- json
	return nil
}

// SendPingEvent sends ping event
func (u *User) SendPingEvent(ping int64) error {
	return u.SendEvent(Event{Type: "ping", UserID: u.ID, Value: ping})
}

// SendEventUser sends user to client to identify himself
func (u *User) SendEventUser() error {
	return u.SendEvent(Event{Type: "user", User: u.Wrap()})
}

// SendEventRoom sends room to client with users except me
func (u *User) SendEventRoom() error {
	return u.SendEvent(Event{Type: "room", Room: u.room.Wrap(u)})
}

// BroadcastEvent sends json body to everyone in the room except this user
func (u *User) BroadcastEvent(event Event) error {
	json, err := json.Marshal(event)
	if err != nil {
		return err
	}
	u.room.Broadcast(json, u)
	return nil
}

// BroadcastEventPing sends everyone user ping
func (u *User) BroadcastEventPing(ping int64) error {
	return u.BroadcastEvent(Event{Type: "ping", UserID: u.ID, Value: ping})
}

// BroadcastEventJoin sends user_join event
func (u *User) BroadcastEventJoin() error {
	return u.BroadcastEvent(Event{Type: "user_join", User: u.Wrap()})
}

// BroadcastEventLeave sends user_leave event
func (u *User) BroadcastEventLeave() error {
	return u.BroadcastEvent(Event{Type: "user_leave", User: u.Wrap()})
}

// BroadcastEventMute sends microphone mute event to everyone
func (u *User) BroadcastEventMute() error {
	return u.BroadcastEvent(Event{Type: "mute", User: u.Wrap()})
}

// BroadcastEventUnmute sends microphone unmute event to everyone
func (u *User) BroadcastEventUnmute() error {
	return u.BroadcastEvent(Event{Type: "unmute", User: u.Wrap()})
}

// SendErr sends error in json format to web socket
func (u *User) SendErr(err error) error {
	return u.SendEvent(Event{Type: "error", Desc: fmt.Sprint(err)})
}

func (u *User) log(msg ...interface{}) {
	log.Println(
		fmt.Sprintf("user %s:", u.ID),
		fmt.Sprint(msg...),
	)
}

// serveWs handles websocket requests from the peer.
func serveWs(rooms *Rooms, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}

	roomID := strings.ReplaceAll(r.URL.Path, "/", "")
	room := rooms.GetOrCreate(roomID)

	log.Println("ws connection to room:", roomID, len(room.GetUsers()), "users")

	usernames := []string{
		"David Bowie", "Eminem", "Bob Dylan", "Frank Sinatra", "Paul McCartney", "Elton John", "Kurt Kobain",
		"Bob Marlie", "Elvis Presley", "John Lennon", "Trent Reznor", "Hans Zimmer", "John Williams", "billie eilish",
	}

	user := &User{
		ID:   strconv.FormatInt(time.Now().UnixNano(), 10), // generate random id based on timestamp
		room: room,
		conn: conn,
		send: make(chan []byte, 256),

		info: UserInfo{
			Name: usernames[rand.Intn(len(usernames))],
			Mute: true, // user is muted by default
		},
	}

	user.room.Join(user)

	// Allow collection of memory referenced by the caller by doing all work in
	// new goroutines.
	go user.writePump()
	go user.readPump()

	user.SendEventUser()
	user.SendEventRoom()
}

type broadcastMsg struct {
	data []byte
	user *User // message will be broadcasted to everyone, except this user
}

// Room maintains the set of active clients and broadcasts messages to the
// clients.
type Room struct {
	Name      string
	users     map[string]*User
	broadcast chan broadcastMsg
	join      chan *User // Register requests from the clients.
	leave     chan *User // Unregister requests from clients.
}

// RoomWrap is a public representation of a room
type RoomWrap struct {
	Users  []*UserWrap `json:"users"`
	Name   string      `json:"name"`
	Online int         `json:"online"`
}

// Wrap returns public version of room
func (r *Room) Wrap(me *User) *RoomWrap {
	usersWrap := []*UserWrap{}
	for _, user := range r.GetUsers() {
		if me != nil {
			// do not add current user to room
			if me.ID == user.ID {
				continue
			}
		}
		usersWrap = append(usersWrap, user.Wrap())
	}

	return &RoomWrap{
		Users:  usersWrap,
		Name:   r.Name,
		Online: len(usersWrap),
	}
}

// NewRoom creates new room
func NewRoom(name string) *Room {
	return &Room{
		broadcast: make(chan broadcastMsg),
		join:      make(chan *User),
		leave:     make(chan *User),
		users:     make(map[string]*User),
		Name:      name,
	}
}

// GetUsers converts map[int64]*User to list
func (r *Room) GetUsers() []*User {
	users := []*User{}
	for _, user := range r.users {
		users = append(users, user)
	}
	return users
}

// GetOtherUsers returns other users of room except current
func (r *Room) GetOtherUsers(user *User) []*User {
	users := []*User{}
	for _, userCandidate := range r.users {
		if user.ID == userCandidate.ID {
			continue
		}
		users = append(users, userCandidate)
	}
	return users
}

// Join connects user and room
func (r *Room) Join(user *User) {
	r.join <- user
}

// Leave disconnects user and room
func (r *Room) Leave(user *User) {
	r.leave <- user
}

// Broadcast sends message to everyone except user (if passed)
func (r *Room) Broadcast(data []byte, user *User) {
	message := broadcastMsg{data: data, user: user}
	r.broadcast <- message
}

// GetUsersCount return users count in the room
func (r *Room) GetUsersCount() int {
	return len(r.GetUsers())
}

func (r *Room) run() {
	for {
		select {
		case user := <-r.join:
			r.users[user.ID] = user
			go user.BroadcastEventJoin()
		case user := <-r.leave:
			if _, ok := r.users[user.ID]; ok {
				delete(r.users, user.ID)
				close(user.send)
			}
			go user.BroadcastEventLeave()
		case message := <-r.broadcast:
			for _, user := range r.users {
				// message will be broadcasted to everyone, except this user
				if message.user != nil && user.ID == message.user.ID {
					continue
				}
				select {
				case user.send <- message.data:
				default:
					close(user.send)
					delete(r.users, user.ID)
				}
			}
		}
	}
}

func main() {
	rooms := NewRooms()
	router := mux.NewRouter()

	router.HandleFunc("/api/stats", func(w http.ResponseWriter, r *http.Request) {
		bytes, err := json.Marshal(rooms.GetStats())
		if err != nil {
			http.Error(w, fmt.Sprint(err), 500)
		}
		w.Write(bytes)
	}).Methods("GET")
	router.HandleFunc("/api/rooms/{id}", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Add("Access-Control-Allow-Headers", "*")
		w.Header().Add("Access-Control-Allow-Origin", "*")
		vars := mux.Vars(r)
		roomID := vars["id"]
		room, err := rooms.Get(roomID)
		if err == errNotFound {
			http.NotFound(w, r)
			return
		}
		bytes, err := json.Marshal(room.Wrap(nil))
		if err != nil {
			http.Error(w, fmt.Sprint(err), 500)
		}
		w.Write(bytes)
	}).Methods("GET")

	router.HandleFunc("/{id}", func(w http.ResponseWriter, r *http.Request) {
		serveWs(rooms, w, r)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "80"
		log.Printf("Defaulting to port %s", port)
	}
	addr := fmt.Sprintf(":%s", port)

	srv := &http.Server{
		Handler:      router,
		Addr:         addr,
		WriteTimeout: 5 * time.Second,
		ReadTimeout:  5 * time.Second,
	}
	var m *autocert.Manager
	hostPolicy := func(ctx context.Context, host string) error {
		// Note: change to your real host
		allowedHost := "ru1.jamhub.io"
		if host == allowedHost {
			return nil
		}
		return fmt.Errorf("acme/autocert: only %s host is allowed", allowedHost)
	}
	m = &autocert.Manager{
		Prompt:     autocert.AcceptTOS,
		HostPolicy: hostPolicy,
		Cache:      autocert.DirCache("."),
	}
	srv.Addr = ":443"
	srv.TLSConfig = &tls.Config{GetCertificate: m.GetCertificate}
	go func() {
		fmt.Printf("listening https on %s\n", srv.Addr)
		log.Fatal(srv.ListenAndServeTLS("", ""))
	}()

	httpSrv := &http.Server{
		Addr:         ":80",
		WriteTimeout: 5 * time.Second,
		ReadTimeout:  5 * time.Second,
	}
	httpSrv.Handler = m.HTTPHandler(httpSrv.Handler)
	err := httpSrv.ListenAndServe()
	if err != nil {
		log.Fatalf("httpSrv.ListenAndServe() failed with %s", err)
	}
}
