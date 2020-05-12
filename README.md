project is in development

# High ping?

You can easily deploy your own server in your region to get lower ping

1. install [deno](https://github.com/denoland/deno) on your vm
2. run this

```bash
nohup deno run --allow-net https://raw.githubusercontent.com/fletcherist/jamsandbox/master/server/mod.ts 80 &
```
