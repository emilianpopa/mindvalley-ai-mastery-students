#!/bin/bash

# ExpandHealth AI Copilot - Knowledge Base Backup Script
# Creates timestamped backups of KB configuration and content

set -e

echo "=========================================="
echo "ExpandHealth Knowledge Base Backup"
echo "=========================================="
echo ""

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="kb_backup_${TIMESTAMP}"

# Create backup directory if doesn't exist
mkdir -p "$BACKUP_DIR"

echo "📦 Creating backup: $BACKUP_NAME"
echo ""

# Create backup archive
tar -czf "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" \
    kb-config.json \
    kb-content/

if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" | cut -f1)
    echo "✅ Backup created successfully!"
    echo ""
    echo "Backup details:"
    echo "  File: $BACKUP_DIR/${BACKUP_NAME}.tar.gz"
    echo "  Size: $BACKUP_SIZE"
    echo ""

    # List recent backups
    echo "Recent backups:"
    ls -lh "$BACKUP_DIR"/kb_backup_*.tar.gz 2>/dev/null | tail -5 || echo "  (none)"
    echo ""

    # Cleanup old backups (keep last 10)
    BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/kb_backup_*.tar.gz 2>/dev/null | wc -l)
    if [ "$BACKUP_COUNT" -gt 10 ]; then
        echo "🧹 Cleaning up old backups (keeping last 10)..."
        ls -t "$BACKUP_DIR"/kb_backup_*.tar.gz | tail -n +11 | xargs rm -f
        echo "✅ Cleanup complete"
    fi

    echo ""
    echo "Restore with: tar -xzf $BACKUP_DIR/${BACKUP_NAME}.tar.gz"
else
    echo "❌ Backup failed!"
    exit 1
fi
