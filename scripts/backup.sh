#!/bin/bash
# 2GO Automated MongoDB Database Backup Script (Bash)
set -e

DB_URI=${1:-"mongodb://localhost:27017/2go_prod"}
BACKUP_DIR=${2:-"./backups"}
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
TARGET_FOLDER="$BACKUP_DIR/backup_$TIMESTAMP"

echo "📦 Starting 2GO Database Backup to $TARGET_FOLDER..."
mkdir -p "$BACKUP_DIR"

mongodump --uri="$DB_URI" --out="$TARGET_FOLDER"

echo "✅ Backup successfully created at: $TARGET_FOLDER"
