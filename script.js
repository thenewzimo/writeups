document.addEventListener('DOMContentLoaded', () => {
    tsParticles.load("particles-js", {
        fpsLimit: 60,
        interactivity: {
            events: {
                onHover: {
                    enable: true,
                    mode: "repulse",
                },
                onClick: {
                    enable: true,
                    mode: "push",
                },
                resize: true,
            },
            modes: {
                push: {
                    quantity: 4,
                },
                repulse: {
                    distance: 150,
                    duration: 0.4,
                },
            },
        },
        particles: {
            color: {
                value: "#ffffff",
            },
            links: {
                color: "#ffffff",
                distance: 150,
                enable: true,
                opacity: 0.3,
                width: 1,
            },
            collisions: {
                enable: true,
            },
            move: {
                direction: "none",
                enable: true,
                outModes: {
                    default: "bounce",
                },
                random: false,
                speed: 1,
                straight: false,
            },
            number: {
                density: {
                    enable: true,
                    area: 600,
                },
                value: 80,
            },
            opacity: {
                value: 0.3,
            },
            shape: {
                type: "circle",
            },
            size: {
                value: { min: 1, max: 5 },
            },
        },
        detectRetina: true,
    });

    const writeupListElement = document.getElementById('writeup-list');
    const contentAreaElement = document.getElementById('content-area');

    const writeups = [
        { title: 'Cat', file: 'Cat.md' },
        { title: 'Code', file: 'Code.md' },
        { title: 'Cypher', file: 'Cypher.md' },
        { title: 'Dog', file: 'Dog.md' },
        { title: 'Heal', file: 'Heal.md' },
        { title: 'Nocturnal', file: 'Nocturnal.md' },
        { title: 'Planning', file: 'Planning.md' },
        { title: 'Titanic', file: 'Titanic.md' },
        { title: 'Underpass', file: 'Underpass.md' },
        { title: 'Editor', file: 'Editor.md' },
    ];
    
    writeups.forEach(writeup => {
        const li = document.createElement('li');
        li.textContent = writeup.title;
        li.dataset.file = writeup.file;
        writeupListElement.appendChild(li);
    });

    writeupListElement.addEventListener('click', (event) => {
        if (event.target && event.target.tagName === 'LI') {
            const fileName = event.target.dataset.file;
            if (fileName) {
                loadWriteup(fileName);
                if (window.innerWidth <= 900) {
                    contentAreaElement.scrollIntoView({ behavior: 'smooth' });
                }
                container.classList.add('viewing-writeup');
            }
        }
    });

    async function loadWriteup(fileName) {
        try {
            const response = await fetch(`writeups/${fileName}`);
            if (!response.ok) {
                throw new Error(`File non trovato: ${response.statusText}`);
            }
            const markdownText = await response.text();
            const htmlContent = marked.parse(markdownText);
            contentAreaElement.style.opacity = 0;
            setTimeout(() => {
                contentAreaElement.innerHTML = htmlContent;
                contentAreaElement.style.opacity = 1;
            }, 300);

        } catch (error) {
            console.error("Errore nel caricamento del write-up:", error);
            contentAreaElement.innerHTML = `<p class="error">Impossibile caricare il write-up. Controlla la console per i dettagli.</p>`;
        }
    }
});