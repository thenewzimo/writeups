# 🕵️ Heal HTB - Walkthrough

## 🔍 Fase 1: Ricognizione Iniziale

La mia avventura su Heal inizia con una scansione `nmap` standard:

```bash
nmap -sC -sV -A heal.htb 
```

I risultati rivelano un trio di porte aperte:

-   **🛡️ Porta 22/tcp:** SSH (OpenSSH)
-   **🌐 Porta 80/tcp:** HTTP (Servizio Web)
-   **❓ Porta 9001/tcp:** `tor-orport` (Interessante, ma per ora accantonata)

Esplorando il sito sulla porta 80 (`http://heal.htb`), trovo una classica pagina di login/registrazione. Tento la registrazione, ma sembra non funzionare... 🧱 bloccato! Un primo giro di `gobuster` sulla root non porta a nulla di succoso.  निराशा

## 🕵️‍♀️ Fase 2: Scavando più a Fondo con Burp e API

Decido di mettere `Burp Suite` all'opera per analizzare il traffico e il codice JavaScript del sito. Ed ecco la svolta! 🔗 Trovo un riferimento a un hostname separato: **`api.heal.htb`**. Aha! Un'API backend!

Riparto con `gobuster`, questa volta mirando all'API:

```bash
gobuster dir -u http://api.heal.htb -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt
```

Questa volta emergono degli endpoint interessanti, anche se protetti (Status 401):

-   `/download` 📂
-   `/profile` 📂
-   `/resume` 📂

## 🔓 Fase 3: Path Traversal e Credenziali

Testando l'endpoint `/download`, scopro una vulnerabilità di **Path Traversal**! All'inizio ottengo pagine bianche, ma giocando con `Burp Suite` e aggiungendo un **`Bearer` token** , riesco a costruire la richiesta vincente:

```http
GET /download?filename=../../../../../../../../etc/passwd HTTP/1.1
Host: api.heal.htb
Authorization: Bearer <IL_TUO_TOKEN_QUI> 
# ... (altri header come nell'esempio originale) ...
```

Successo! 📜 Scarico `/etc/passwd` e trovo due utenti con shell: **`ralph`** e **`ron`** 👤👤.

Sfruttando ancora il Path Traversal, individuo il file `config/database.yml` e da lì il percorso del database: `storage/development.sqlite3`. Scarico anche quello! 💾

Dentro il database trovo l'hash bcrypt di `ralph`:
**`$2a$12$dUZ/O7KJT3.zE4TOK8p4RuxH3t.Bz45DSr7A94VLvY9SWx1GCSZnG`**

È tempo di chiamare `John the Ripper`:

```bash
echo '$2a$12$dUZ/O7KJT3.zE4TOK8p4RuxH3t.Bz45DSr7A94VLvY9SWx1GCSZnG' > hash.txt
john hash.txt --wordlist=/usr/share/wordlists/rockyou.txt --format=bcrypt
```

🔨 Crack! La password è: **`147258369`** 🔑.

Con queste credenziali (`ralph` / `147258369`), finalmente accedo all'applicazione web sulla porta 80. ✅

## 🖥️ Fase 4: Shell Utente via LimeSurvey RCE

Una volta dentro, noto la presenza di **LimeSurvey**. Una rapida ricerca rivela un exploit **RCE tramite upload di plugin**! 🐛

1.  Preparo un payload `php-rev.php`.
2.  Lo carico come plugin tramite l'interfaccia di LimeSurvey.
3.  Lo attivo!
4.  Mi metto in ascolto con `nc` sulla mia macchina:
 ```bash
 	nc -lvnp 4444 
   ```
5.  Eseguo l'azione che triggera il plugin... et voilà! Ottengo una reverse shell come utente `www-data`. 🐚

Frugando nel filesystem come `www-data`, trovo il file `config.php` con una password hardcoded: **`AdmiDi0_pA$$w0rd`** 📄🤫.

Provo questa password con SSH per l'utente `ron`:

```bash
ssh ron@heal.htb
# Password: AdmiDi0_pA$$w0rd
```

Accesso riuscito! Sono `ron`! Posso finalmente catturare la flag **🏴 user.txt**.

## 🚀 Fase 5: Escalation dei Privilegi via Consul

Controllo i privilegi e i servizi locali come `ron`:

```bash
ss -lntp 
# oppure netstat -lntp
```

Scopro un servizio in ascolto solo su `127.0.0.1` sulla porta **`8500`** 👂. Si tratta di **HashiCorp Consul**!

Per interagirci dalla mia macchina, imposto un **Port Forwarding SSH**:

```bash
# Sulla macchina attaccante
ssh -L 8500:127.0.0.1:8500 ron@heal.htb 
```

🚇 Ora posso accedere a `http://localhost:8500` dal mio browser. Identifico la versione e trovo un noto exploit RCE per Consul (come **Exploit-DB 51117**) 💥.

Verifico se è necessario un token ACL (spoiler: no!):

```bash
curl -X PUT http://127.0.0.1:8500/v1/agent/service/register -d '{}' 
```

La richiesta va a buon fine, confermando che gli ACL sono disabilitati o mal configurati ✔️. Modifico lo script dell'exploit per **rimuovere la gestione del token** e lo lancio!

1.  Avvio un altro listener `nc` sulla mia macchina:

    ```bash
    nc -lvnp 9001 
    ```
2.  Eseguo l'exploit modificato puntando a `http://127.0.0.1:8500`, configurandolo per inviare una shell al mio IP sulla porta 9001. 🔥💻

Boom! Ricevo una connessione... controllo con `whoami`... sono **`root`**! 👑

Navigo in `/root/` e catturo l'ultima flag **🏴 root.txt**.

---

🎯 **Heal HTB Pwned!** 🎉 Missione compiuta!