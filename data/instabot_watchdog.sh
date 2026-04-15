#!/bin/bash
# InstaBOT Uptime Guardian
# Restarts bot if it crashes or stops

BOT_DIR="/data/data/com.termux/files/home/InstaBOT"
BOT_PID_FILE="/data/data/com.termux/files/home/.picoclaw/data/instabot.pid"

while true; do
    if [ -f "$BOT_PID_FILE" ]; then
        PID=$(cat "$BOT_PID_FILE")
        if ! kill -0 "$PID" 2>/dev/null; then
            echo "[$(date)] Bot dead (PID $PID), restarting..." >> /data/data/com.termux/files/home/.picoclaw/data/instabot_watch.log
            cd "$BOT_DIR"
            nohup node index.js > bot.log 2>&1 &
            echo $! > "$BOT_PID_FILE"
            echo "[$(date)] Restarted with PID $!" >> /data/data/com.termux/files/home/.picoclaw/data/instabot_watch.log
        fi
    else
        cd "$BOT_DIR"
        nohup node index.js > bot.log 2>&1 &
        echo $! > "$BOT_PID_FILE"
        echo "[$(date)] First start PID $!" >> /data/data/com.termux/files/home/.picoclaw/data/instabot_watch.log
    fi
    sleep 30
done