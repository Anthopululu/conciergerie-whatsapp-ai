# Guide d'Installation CapRover - Étape par Étape

## 🔴 Problème Actuel
Les ports 80, 443, 3000 sont fermés. CapRover n'est pas accessible.

## ✅ Solution Complète

### ÉTAPE 1 : Se Connecter au Serveur

Ouvrez votre terminal et exécutez :

```bash
ssh root@178.128.205.135
```

Si c'est la première fois, vous devrez accepter la clé SSH (tapez `yes`).

---

### ÉTAPE 2 : Installer Docker et CapRover

Une fois connecté au serveur, copiez-collez **TOUTE** cette commande d'un coup :

```bash
curl -fsSL https://get.docker.com | sh && docker stop captain-caprover 2>/dev/null; docker rm captain-caprover 2>/dev/null; docker run -d -p 80:80 -p 443:443 -p 3000:3000 -v /var/run/docker.sock:/var/run/docker.sock -v /captain:/captain --name captain-caprover --restart=always caprover/caprover && echo "✅ Installation terminée!" && sleep 60 && docker ps | grep captain && echo "📋 Vérifiez les logs:" && docker logs captain-caprover --tail 10
```

**Cette commande va :**
- Installer Docker
- Installer CapRover
- Attendre 1 minute
- Afficher le statut
- Afficher les logs

**Attendez que la commande se termine complètement** (peut prendre 2-3 minutes).

---

### ÉTAPE 3 : Vérifier que CapRover Tourne

Après l'installation, vérifiez :

```bash
docker ps | grep captain
```

Vous devriez voir quelque chose comme :
```
CONTAINER ID   IMAGE              STATUS         PORTS
abc123def456   caprover/caprover  Up 2 minutes   0.0.0.0:80->80/tcp, ...
```

Si vous voyez le conteneur, c'est bon ! ✅

---

### ÉTAPE 4 : Configurer le Firewall DigitalOcean

**C'est probablement la cause du problème !**

1. **Allez dans DigitalOcean Dashboard**
   - https://cloud.digitalocean.com

2. **Cliquez sur votre Droplet** (178.128.205.135)

3. **Onglet "Networking"**

4. **Section "Firewalls"**
   - Si vous voyez un firewall attaché, cliquez dessus
   - Sinon, cliquez sur **"Create Firewall"**

5. **Créer le Firewall :**
   - **Name** : `conciergerie-firewall`
   - **Inbound Rules** (cliquez sur "Add Rule" pour chaque) :
     ```
     Type: HTTP
     Port: 80
     Sources: All IPv4, All IPv6
     ```
     ```
     Type: HTTPS
     Port: 443
     Sources: All IPv4, All IPv6
     ```
     ```
     Type: Custom
     Port: 3000
     Sources: All IPv4, All IPv6
     ```
   - **Outbound Rules** : Laissez par défaut (Allow All)
   - Cliquez sur **"Create Firewall"**

6. **Attacher le Firewall au Droplet :**
   - Dans la page du firewall, cliquez sur **"Droplets"**
   - Sélectionnez votre droplet (178.128.205.135)
   - Cliquez sur **"Assign Droplets"**

---

### ÉTAPE 5 : Vérifier les Ports sur le Serveur

Reconnectez-vous au serveur et vérifiez :

```bash
ssh root@178.128.205.135
netstat -tuln | grep -E ':(80|443|3000)'
```

Vous devriez voir :
```
tcp6  0  0 :::80   :::*   LISTEN
tcp6  0  0 :::443  :::*   LISTEN
tcp6  0  0 :::3000 :::*   LISTEN
```

---

### ÉTAPE 6 : Tester l'Accès

Attendez 2-3 minutes après l'installation, puis :

1. Ouvrez votre navigateur
2. Allez sur : **http://178.128.205.135**
3. Vous devriez voir l'écran de configuration CapRover ! 🎉

---

## 🔧 Si ça ne fonctionne toujours pas

### Vérifier les logs CapRover :

```bash
ssh root@178.128.205.135
docker logs captain-caprover -f
```

### Redémarrer CapRover :

```bash
docker restart captain-caprover
```

### Vérifier le firewall local (UFW) :

```bash
ufw status
# Si actif, ouvrir les ports :
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3000/tcp
```

---

## 📞 Checklist Finale

- [ ] Docker installé (`docker --version`)
- [ ] CapRover en cours d'exécution (`docker ps | grep captain`)
- [ ] Ports ouverts localement (`netstat -tuln | grep -E ':(80|443|3000)'`)
- [ ] Firewall DigitalOcean configuré avec ports 80, 443, 3000
- [ ] Firewall attaché au Droplet
- [ ] Attendu 2-3 minutes après installation
- [ ] Testé dans le navigateur : http://178.128.205.135

---

## 🆘 Besoin d'aide ?

Si après toutes ces étapes ça ne fonctionne pas, envoyez-moi :
1. Le résultat de : `docker ps | grep captain`
2. Le résultat de : `docker logs captain-caprover --tail 20`
3. Une capture d'écran de votre firewall DigitalOcean


