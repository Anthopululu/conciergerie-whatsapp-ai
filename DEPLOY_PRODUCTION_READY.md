# Déploiement Production-Ready

Guide complet pour un déploiement production-ready avec haute disponibilité, monitoring, backups, et sécurité.

---

## 🎯 Architecture Production-Ready Recommandée

### Option 1 : AWS (Recommandé pour Production)

**Architecture complète :**
```
Frontend Conciergerie → CloudFront (CDN) → S3/Amplify
Frontend Admin → CloudFront (CDN) → S3/Amplify
Backend → ECS Fargate (Container) → RDS PostgreSQL (ou garder SQLite avec backups)
Twilio Webhook → Application Load Balancer → ECS Fargate
Monitoring → CloudWatch
Backups → S3 + Automated Snapshots
```

**Avantages :**
- ✅ Haute disponibilité (multi-AZ)
- ✅ Auto-scaling
- ✅ Monitoring complet (CloudWatch)
- ✅ Backups automatiques
- ✅ CDN global (CloudFront)
- ✅ SSL/TLS automatique
- ✅ Load balancing
- ✅ Health checks

**Coût estimé :** ~$50-150/mois selon le trafic

---

### Option 2 : Railway Pro (Simple mais Production-Ready)

**Architecture :**
```
Frontend Conciergerie → Railway Static Site (CDN intégré)
Frontend Admin → Railway Static Site (CDN intégré)
Backend → Railway Web Service (Auto-scaling)
Database → Railway PostgreSQL (ou SQLite avec backups S3)
Monitoring → Railway Logs + Sentry
Backups → Automated PostgreSQL backups
```

**Avantages :**
- ✅ Simple à configurer
- ✅ Auto-scaling
- ✅ Monitoring intégré
- ✅ Backups automatiques (PostgreSQL)
- ✅ SSL automatique
- ✅ CDN intégré

**Coût estimé :** ~$20-50/mois

---

## 🚀 Déploiement Production-Ready sur AWS

### Architecture Complète AWS

#### 1. Base de Données : Migration vers PostgreSQL

SQLite n'est pas idéal pour la production. Migrons vers PostgreSQL.

**Créer une base de données RDS PostgreSQL :**

```bash
# Via AWS CLI
aws rds create-db-instance \
  --db-instance-identifier conciergerie-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username admin \
  --master-user-password YourSecurePassword123! \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-xxxxx \
  --backup-retention-period 7 \
  --multi-az
```

**Ou via Console AWS :**
1. Allez dans RDS > Create database
2. **Engine** : PostgreSQL 15
3. **Template** : Free tier (ou Production)
4. **DB instance class** : db.t3.micro (gratuit) ou db.t3.small (production)
5. **Multi-AZ** : Oui (pour haute disponibilité)
6. **Backup retention** : 7 jours
7. Créez la base

#### 2. Backend : ECS Fargate avec Load Balancer

**Créer un Cluster ECS :**

```bash
# Créer le cluster
aws ecs create-cluster --cluster-name conciergerie-cluster

# Créer le task definition
aws ecs register-task-definition \
  --family conciergerie-backend \
  --network-mode awsvpc \
  --requires-compatibilities FARGATE \
  --cpu 512 \
  --memory 1024 \
  --container-definitions '[
    {
      "name": "conciergerie-backend",
      "image": "your-ecr-repo/conciergerie-backend:latest",
      "portMappings": [{"containerPort": 3000}],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "PORT", "value": "3000"}
      ],
      "secrets": [
        {"name": "TWILIO_ACCOUNT_SID", "valueFrom": "arn:aws:secretsmanager:..."},
        {"name": "TWILIO_AUTH_TOKEN", "valueFrom": "arn:aws:secretsmanager:..."},
        {"name": "ANTHROPIC_API_KEY", "valueFrom": "arn:aws:secretsmanager:..."}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/conciergerie-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]'
```

**Créer un Application Load Balancer :**
- Allez dans EC2 > Load Balancers > Create
- **Type** : Application Load Balancer
- **Scheme** : Internet-facing
- **Listeners** : HTTPS (443) avec certificat SSL
- **Target group** : Pointe vers votre service ECS

**Créer le Service ECS :**
- **Service name** : conciergerie-backend
- **Task definition** : conciergerie-backend
- **Desired count** : 2 (minimum pour HA)
- **Auto-scaling** : 2-10 instances selon CPU/Memory

#### 3. Frontends : CloudFront + S3

**Déployer les frontends sur S3 + CloudFront :**

```bash
# Build les frontends
cd frontend && npm run build
cd ../frontend-admin && npm run build

# Upload vers S3
aws s3 sync frontend/dist s3://conciergerie-frontend-bucket --delete
aws s3 sync frontend-admin/dist s3://conciergerie-admin-bucket --delete

# Créer les distributions CloudFront
aws cloudfront create-distribution \
  --origin-domain-name conciergerie-frontend-bucket.s3.amazonaws.com \
  --default-root-object index.html
```

**Configuration CloudFront :**
- **Origin** : S3 bucket
- **Behaviors** : Cache avec invalidation
- **SSL Certificate** : ACM (gratuit)
- **Custom Domain** : app.votre-domaine.com

#### 4. Monitoring : CloudWatch

**Créer des dashboards CloudWatch :**
- Métriques ECS (CPU, Memory, Request count)
- Métriques RDS (Connections, CPU, Storage)
- Logs agrégés
- Alarms pour alertes

**Créer des Alarms :**
- CPU > 80% pendant 5 minutes
- Memory > 90%
- Erreurs HTTP > 10/min
- Database connections > 80%

#### 5. Backups Automatiques

**RDS :**
- Backups automatiques activés (7 jours de rétention)
- Snapshots manuels avant déploiements majeurs

**SQLite (si vous gardez SQLite) :**
```bash
# Script de backup quotidien vers S3
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
aws s3 cp /app/concierge.db s3://conciergerie-backups/db/concierge-${DATE}.db
# Garder seulement les 30 derniers backups
aws s3 ls s3://conciergerie-backups/db/ | sort -r | tail -n +31 | awk '{print $4}' | xargs -I {} aws s3 rm s3://conciergerie-backups/db/{}
```

#### 6. CI/CD : GitHub Actions

Créer `.github/workflows/deploy-production.yml` :

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]
    tags: [ 'v*' ]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Login to Amazon ECR
        uses: aws-actions/amazon-ecr-login@v1
      
      - name: Build and push Docker image
        run: |
          cd backend
          docker build -t conciergerie-backend:${{ github.sha }} .
          docker tag conciergerie-backend:${{ github.sha }} ${{ secrets.ECR_REPOSITORY }}:latest
          docker push ${{ secrets.ECR_REPOSITORY }}:latest
      
      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster conciergerie-cluster \
            --service conciergerie-backend \
            --force-new-deployment

  deploy-frontends:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Build and deploy frontend
        run: |
          cd frontend
          npm ci
          npm run build
          aws s3 sync dist/ s3://conciergerie-frontend-bucket --delete
          aws cloudfront create-invalidation --distribution-id ${{ secrets.CLOUDFRONT_DIST_ID }} --paths "/*"
      
      - name: Build and deploy frontend-admin
        run: |
          cd frontend-admin
          npm ci
          npm run build
          aws s3 sync dist/ s3://conciergerie-admin-bucket --delete
          aws cloudfront create-invalidation --distribution-id ${{ secrets.CLOUDFRONT_ADMIN_DIST_ID }} --paths "/*"
```

---

## 🔒 Sécurité Production-Ready

### 1. Secrets Management

**Utiliser AWS Secrets Manager :**
```bash
# Créer les secrets
aws secretsmanager create-secret \
  --name conciergerie/twilio \
  --secret-string '{"account_sid":"...","auth_token":"..."}'

aws secretsmanager create-secret \
  --name conciergerie/anthropic \
  --secret-string '{"api_key":"..."}'
```

### 2. WAF (Web Application Firewall)

**Protéger avec AWS WAF :**
- Rate limiting
- Protection DDoS
- Filtrage de requêtes malveillantes
- IP whitelisting pour admin

### 3. VPC et Security Groups

- Backend dans un VPC privé
- Seul le Load Balancer est public
- Database dans un subnet privé
- Security groups restrictifs

### 4. SSL/TLS

- Certificats ACM (gratuits)
- HTTPS forcé partout
- HSTS activé

---

## 📊 Monitoring et Observabilité

### 1. CloudWatch Dashboards

**Métriques à surveiller :**
- CPU/Memory utilisation
- Request rate et latency
- Error rate (4xx, 5xx)
- Database connections
- Queue depth (si vous utilisez des queues)

### 2. Application Performance Monitoring

**Intégrer Sentry ou DataDog :**
```bash
# Sentry pour les erreurs
npm install @sentry/node

# Dans backend/src/server.ts
import * as Sentry from "@sentry/node";
Sentry.init({ dsn: process.env.SENTRY_DSN });
```

### 3. Logs Centralisés

**CloudWatch Logs :**
- Tous les logs dans CloudWatch
- Log retention : 30 jours
- Log aggregation et recherche

---

## 🔄 Auto-Scaling

### Configuration ECS Auto-Scaling

```json
{
  "minCapacity": 2,
  "maxCapacity": 10,
  "targetTrackingScalingPolicies": [
    {
      "targetValue": 70.0,
      "predefinedMetricSpecification": {
        "predefinedMetricType": "ECSServiceAverageCPUUtilization"
      }
    },
    {
      "targetValue": 80.0,
      "predefinedMetricSpecification": {
        "predefinedMetricType": "ECSServiceAverageMemoryUtilization"
      }
    }
  ]
}
```

---

## 💾 Backups et Disaster Recovery

### 1. Database Backups

**RDS :**
- Automated backups : 7 jours
- Point-in-time recovery
- Multi-AZ pour haute disponibilité

**SQLite (si gardé) :**
- Backup quotidien vers S3
- Versioning activé sur S3
- Cross-region replication

### 2. Disaster Recovery Plan

1. **RTO (Recovery Time Objective)** : 1 heure
2. **RPO (Recovery Point Objective)** : 15 minutes
3. **Backup Strategy** :
   - Backups quotidiens
   - Snapshots avant déploiements
   - Test de restauration mensuel

---

## 🚀 Déploiement Production-Ready Simplifié : Railway Pro

Si AWS semble trop complexe, Railway Pro offre une solution production-ready plus simple :

### Configuration Railway Pro

1. **Upgrade vers Railway Pro** ($20/mois)
2. **Backend** :
   - Service avec auto-scaling
   - Health checks
   - Zero-downtime deployments
3. **Database** :
   - Railway PostgreSQL (backups automatiques)
   - Ou garder SQLite avec backups S3
4. **Frontends** :
   - Static sites avec CDN
   - Custom domains avec SSL
5. **Monitoring** :
   - Logs en temps réel
   - Métriques intégrées
   - Alertes configurable

**Avantages Railway Pro :**
- ✅ Production-ready sans complexité AWS
- ✅ Auto-scaling
- ✅ Backups automatiques (PostgreSQL)
- ✅ Monitoring intégré
- ✅ SSL automatique
- ✅ CDN intégré
- ✅ Zero-downtime deployments

---

## 📋 Checklist Production-Ready

### Infrastructure
- [ ] Haute disponibilité (multi-instances)
- [ ] Auto-scaling configuré
- [ ] Load balancing
- [ ] Health checks
- [ ] Database avec backups automatiques
- [ ] CDN pour les frontends

### Sécurité
- [ ] HTTPS partout (SSL/TLS)
- [ ] Secrets dans un gestionnaire de secrets
- [ ] WAF configuré
- [ ] Security groups restrictifs
- [ ] Rate limiting
- [ ] Authentification sécurisée

### Monitoring
- [ ] Logs centralisés
- [ ] Métriques en temps réel
- [ ] Alarms configurés
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring

### Backups
- [ ] Backups automatiques quotidiens
- [ ] Rétention de 7-30 jours
- [ ] Test de restauration mensuel
- [ ] Backups cross-region

### CI/CD
- [ ] Déploiement automatique
- [ ] Tests avant déploiement
- [ ] Zero-downtime deployments
- [ ] Rollback automatique en cas d'erreur

### Documentation
- [ ] Runbook pour opérations
- [ ] Procédures de disaster recovery
- [ ] Documentation d'architecture
- [ ] On-call procedures

---

## 💰 Coûts Estimés

### AWS Production-Ready
- **RDS PostgreSQL** : $15-50/mois
- **ECS Fargate** : $30-100/mois (2-10 instances)
- **Application Load Balancer** : $16/mois
- **CloudFront** : $5-20/mois
- **S3 + Backups** : $5-10/mois
- **CloudWatch** : $5-15/mois
- **Total** : ~$76-211/mois

### Railway Pro (Simplifié)
- **Railway Pro** : $20/mois
- **PostgreSQL** : $5-15/mois
- **Total** : ~$25-35/mois

---

## 🎯 Recommandation Finale

**Pour une vraie production-ready :**
1. **AWS** si vous avez besoin de contrôle total et de scale
2. **Railway Pro** si vous voulez simple mais production-ready

**Pour commencer en production :**
- Commencez avec **Railway Pro** (plus simple)
- Migrez vers **AWS** si vous avez besoin de plus de scale

---

## 📚 Ressources

- AWS Well-Architected Framework : https://aws.amazon.com/architecture/well-architected/
- Railway Production Guide : https://docs.railway.app/guides/production-checklist
- 12-Factor App : https://12factor.net/


