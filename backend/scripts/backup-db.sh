#!/bin/bash

# Script de backup de la base de données SQLite pour production
# À exécuter quotidiennement via cron

set -e

BACKUP_DIR="/app/backups"
DB_PATH="/app/concierge.db"
S3_BUCKET="${S3_BACKUP_BUCKET:-conciergerie-backups}"
RETENTION_DAYS=30

# Créer le dossier de backup si nécessaire
mkdir -p "$BACKUP_DIR"

# Générer le nom du backup avec timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/concierge-${TIMESTAMP}.db"

# Faire le backup
if [ -f "$DB_PATH" ]; then
    echo "📦 Création du backup: $BACKUP_FILE"
    cp "$DB_PATH" "$BACKUP_FILE"
    echo "✅ Backup créé: $BACKUP_FILE"
    
    # Compresser le backup
    gzip "$BACKUP_FILE"
    BACKUP_FILE="${BACKUP_FILE}.gz"
    echo "✅ Backup compressé: $BACKUP_FILE"
    
    # Upload vers S3 si configuré
    if [ -n "$AWS_ACCESS_KEY_ID" ] && [ -n "$S3_BACKUP_BUCKET" ]; then
        echo "☁️  Upload vers S3..."
        aws s3 cp "$BACKUP_FILE" "s3://${S3_BUCKET}/db/$(basename $BACKUP_FILE)"
        echo "✅ Backup uploadé vers S3"
        
        # Nettoyer les anciens backups S3 (garder 30 jours)
        echo "🧹 Nettoyage des anciens backups S3..."
        aws s3 ls "s3://${S3_BUCKET}/db/" | \
            awk '{print $4}' | \
            sort -r | \
            tail -n +$((RETENTION_DAYS + 1)) | \
            xargs -I {} aws s3 rm "s3://${S3_BUCKET}/db/{}" || true
    fi
    
    # Nettoyer les anciens backups locaux (garder 7 jours)
    echo "🧹 Nettoyage des anciens backups locaux..."
    find "$BACKUP_DIR" -name "concierge-*.db.gz" -mtime +7 -delete
    
    echo "✅ Backup terminé avec succès"
else
    echo "❌ Erreur: Base de données non trouvée à $DB_PATH"
    exit 1
fi


