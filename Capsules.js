/* Capsules.js - Systeme des Capsules Organiques Scellees (Chests + Buffs temporaires) */

window.capsulesManager = {

    config: {
        icon: './images/items/capsule organique scellee.png',

        // Progression de la jauge (degats requis pour obtenir une capsule)
        baseRequirement: 500,       // Degats requis pour la 1ere capsule
        growthFactor: 1.35,         // Croissance exponentielle par capsule deja obtenue
        capMultiplierPerPlant: 40,  // Cap : jamais plus que (PV max de la plante de la route) x ce facteur

        minDureeBuffMs: 60 * 1000,  // Duree minimum d'un objet actif (1 min, ameliorable plus tard)

        // Objets bonus obtenables aleatoirement en ouvrant une capsule
        items: {
            seveCorrosive: {
                name: "Sève Corrosive",
                icon: "⚔️",
                desc: "+50% dégâts du Sécateur",
                type: "secateur_damage_mult",
                mode: "mult",
                valeur: 0.5,
                poids: 20
            },
            catalyseurSeve: {
                name: "Catalyseur de Sève",
                icon: "🧪",
                desc: "+100% sève obtenue à l'extraction",
                type: "sap_mult",
                mode: "mult",
                valeur: 1.0,
                poids: 20
            },
            nectarCroissance: {
                name: "Nectar de Croissance",
                icon: "📈",
                desc: "+100% XP gagnée",
                type: "xp_mult",
                mode: "mult",
                valeur: 1.0,
                poids: 20
            },
            accelerateurChlorophyllien: {
                name: "Accélérateur Chlorophyllien",
                icon: "⏩",
                desc: "Symbiotes 2x plus rapides (attaque + déplacement)",
                type: "symbiote_speed_mult",
                mode: "mult",
                valeur: 1.0, // multiplicateur final = 1 + valeur = x2
                poids: 10
            },
            instinctPredateur: {
                name: "Instinct Prédateur Éveillé",
                icon: "🎯",
                desc: "+25% chance de critique",
                type: "crit_chance_add",
                mode: "add",
                valeur: 0.25,
                poids: 15
            },
            alchimieDoree: {
                name: "Alchimie Dorée",
                icon: "💰",
                desc: "+75% golds à la vente des plantes",
                type: "gold_sale_mult",
                mode: "mult",
                valeur: 0.75,
                poids: 15
            },
            chronoAccelerateur: {
                name: "Chrono-Accélérateur",
                icon: "⏱️",
                desc: "Double la vitesse du jeu (déplacement et cadence d'attaque des symbiotes)",
                type: "game_speed_mult",
                mode: "mult",
                valeur: 1.0, // multiplicateur final = 1 + valeur = x2
                poids: 10
            }
        }
    },

    _intervalId: null,

    // --- ETAT / SAUVEGARDE ---

    ensureDefaults: function() {
        if (!window.gameState) return;
        if (typeof window.gameState.capsulesGaugeCurrent !== 'number') window.gameState.capsulesGaugeCurrent = 0;
        if (typeof window.gameState.capsulesObtenues !== 'number') window.gameState.capsulesObtenues = 0;
        if (typeof window.gameState.capsulesStock !== 'number') window.gameState.capsulesStock = 0;
        if (!window.gameState.objetsInventaire) window.gameState.objetsInventaire = {};
        if (!window.gameState.buffsActifs) window.gameState.buffsActifs = {};
    },

    // --- JAUGE DE PROGRESSION ---

    /**
     * Requis exponentiel, mais cape en fonction des PV max de la plante de la route actuelle
     * pour rester toujours atteignable avec la puissance du joueur du moment.
     */
    getRequirementActuel: function() {
        this.ensureDefaults();
        const niveau = window.gameState.capsulesObtenues || 0;
        const exponentiel = Math.floor(this.config.baseRequirement * Math.pow(this.config.growthFactor, niveau));

        const db = window.PLANT_DB;
        // IMPORTANT : on utilise la route la PLUS AVANCEE jamais debloquee, PAS la route
        // actuellement affichee (currentRoute). On combine unlockedRoute (progression de la
        // run actuelle) ET plusHauteRouteAtteinte (record PERMANENT qui survit meme a une
        // Mutation Genetique) pour qu'un joueur avec un build deja puissant ne puisse jamais
        // trivialiser le plafond en revenant farmer une route facile (ex: route 1, PV tres bas).
        const routeReference = Math.max(
            window.gameState.currentRoute || 1,
            window.gameState.unlockedRoute || 1,
            window.gameState.plusHauteRouteAtteinte || 1
        );
        const routeIndex = routeReference - 1;
        const plantRef = db && db[routeIndex] ? db[routeIndex] : null;
        const capMax = plantRef ? Math.floor(plantRef.maxHp * this.config.capMultiplierPerPlant) : exponentiel;

        return Math.max(50, Math.min(exponentiel, capMax));
    },

    /**
     * Appelee a chaque degat inflige (joueur OU symbiotes) via le hook dans secateur.js
     */
    ajouterDegatsJauge: function(damage) {
        if (!damage || damage <= 0) return;
        this.ensureDefaults();

        window.gameState.capsulesGaugeCurrent += damage;

        let capsulesGagnees = 0;
        while (window.gameState.capsulesGaugeCurrent >= this.getRequirementActuel()) {
            window.gameState.capsulesGaugeCurrent -= this.getRequirementActuel();
            window.gameState.capsulesObtenues += 1;
            window.gameState.capsulesStock += 1;
            capsulesGagnees++;
        }

        if (capsulesGagnees > 0) {
            if (window.afficherToast) {
                window.afficherToast(`📦 ${capsulesGagnees > 1 ? capsulesGagnees + ' Capsules obtenues !' : 'Capsule Organique obtenue !'}`, 'info');
            }
            window.sauvegarderProgression();
            this.refreshMenuUI();
        }

        this.updateJaugeUI();
    },

    // --- OUVERTURE DES CAPSULES ---

    tirerObjetAleatoire: function() {
        const items = this.config.items;
        const entries = Object.keys(items).map(id => ({ id, poids: items[id].poids }));
        const totalPoids = entries.reduce((sum, e) => sum + e.poids, 0);
        let roll = Math.random() * totalPoids;
        for (const e of entries) {
            if (roll < e.poids) return e.id;
            roll -= e.poids;
        }
        return entries[0].id;
    },

    ouvrirCapsule: function() {
        this.ensureDefaults();
        if (window.gameState.capsulesStock <= 0) return;

        window.gameState.capsulesStock -= 1;
        const itemId = this.tirerObjetAleatoire();
        window.gameState.objetsInventaire[itemId] = (window.gameState.objetsInventaire[itemId] || 0) + 1;

        window.sauvegarderProgression();
        this.refreshMenuUI();
        this.updateJaugeUI();

        const item = this.config.items[itemId];
        if (window.afficherToast) window.afficherToast(`📦 Capsule ouverte : ${item.icon} ${item.name} !`, 'info');
    },

    /**
     * Ouvre TOUT le stock de capsules en une seule fois : tirage groupe, une seule
     * sauvegarde, un seul toast recapitulatif (au lieu de spammer un toast par capsule).
     */
    ouvrirToutesLesCapsules: function() {
        this.ensureDefaults();
        const total = window.gameState.capsulesStock || 0;
        if (total <= 0) return;

        const gains = {};
        for (let i = 0; i < total; i++) {
            const itemId = this.tirerObjetAleatoire();
            window.gameState.objetsInventaire[itemId] = (window.gameState.objetsInventaire[itemId] || 0) + 1;
            gains[itemId] = (gains[itemId] || 0) + 1;
        }
        window.gameState.capsulesStock = 0;

        window.sauvegarderProgression();
        this.refreshMenuUI();
        this.updateJaugeUI();

        const resume = Object.keys(gains)
            .map(id => `${this.config.items[id].icon} x${gains[id]}`)
            .join('  ');
        if (window.afficherToast) window.afficherToast(`📦 ${total} capsules ouvertes : ${resume}`, 'info');
    },

    // --- UTILISATION DES OBJETS (buffs cumulables en duree) ---

    utiliserObjet: function(itemId) {
        this.ensureDefaults();
        const count = window.gameState.objetsInventaire[itemId] || 0;
        if (count <= 0) return;

        window.gameState.objetsInventaire[itemId] -= 1;
        if (window.gameState.objetsInventaire[itemId] <= 0) delete window.gameState.objetsInventaire[itemId];

        const now = Date.now();
        const expirationActuelle = window.gameState.buffsActifs[itemId] || 0;
        const base = Math.max(expirationActuelle, now);
        window.gameState.buffsActifs[itemId] = base + this.config.minDureeBuffMs;

        window.sauvegarderProgression();
        this.refreshMenuUI();

        const item = this.config.items[itemId];
        if (window.afficherToast) window.afficherToast(`✅ ${item.name} activé !`, 'info');
    },

    // --- LECTURE DYNAMIQUE DES BONUS (utilisee par les autres modules) ---

    getMultiplier: function(type) {
        this.ensureDefaults();
        let total = 1;
        const now = Date.now();
        Object.keys(window.gameState.buffsActifs).forEach(itemId => {
            if (window.gameState.buffsActifs[itemId] > now) {
                const item = this.config.items[itemId];
                if (item && item.type === type && item.mode === 'mult') {
                    total *= (1 + item.valeur);
                }
            }
        });
        return total;
    },

    getBonusAdditif: function(type) {
        this.ensureDefaults();
        let total = 0;
        const now = Date.now();
        Object.keys(window.gameState.buffsActifs).forEach(itemId => {
            if (window.gameState.buffsActifs[itemId] > now) {
                const item = this.config.items[itemId];
                if (item && item.type === type && item.mode === 'add') {
                    total += item.valeur;
                }
            }
        });
        return total;
    },

    // --- UI : JAUGE VERTICALE A GAUCHE ---

    creerUIJauge: function() {
        if (document.getElementById('capsule-gauge-container')) return;

        const container = document.createElement('div');
        container.id = 'capsule-gauge-container';
        container.innerHTML = `
            <div class="capsule-gauge-icon-wrap" onclick="window.capsulesManager.ouvrirMenuCapsules()" title="Capsules & Objets Bonus">
                <img src="${this.config.icon}" class="capsule-gauge-icon" alt="Capsule" onerror="this.remove();">
                <span id="capsule-stock-badge" class="capsule-stock-badge" style="display:none;">0</span>
            </div>
            <div class="capsule-gauge-track">
                <div id="capsule-gauge-fill" class="capsule-gauge-fill"></div>
            </div>
        `;
        document.body.appendChild(container);
        this.injectStylesJauge();
    },

    updateJaugeUI: function() {
        const fill = document.getElementById('capsule-gauge-fill');
        const badge = document.getElementById('capsule-stock-badge');
        if (!fill) return;

        const requis = this.getRequirementActuel();
        const current = window.gameState.capsulesGaugeCurrent || 0;
        const pct = Math.max(0, Math.min(100, (current / requis) * 100));
        fill.style.height = `${pct}%`;

        if (badge) {
            const stock = window.gameState.capsulesStock || 0;
            badge.textContent = stock;
            badge.style.display = stock > 0 ? 'flex' : 'none';
        }
    },

    // --- UI : BOUTON DANS LA ZONE DE JEU (BAS) ---

    creerBoutonBas: function() {
        if (document.getElementById('capsule-bottom-btn')) return;
        const gameArea = document.getElementById('game-area');
        if (!gameArea) return;

        const btn = document.createElement('div');
        btn.id = 'capsule-bottom-btn';
        btn.innerHTML = '📦';
        btn.title = 'Capsules & Objets Bonus';
        btn.onclick = (e) => { e.stopPropagation(); this.ouvrirMenuCapsules(); };

        gameArea.appendChild(btn);
    },

    // --- UI : OVERLAY MENU (Ouvrir capsules + Utiliser objets) ---

    ouvrirMenuCapsules: function() {
        this.ensureDefaults();
        if (document.getElementById('capsules-overlay')) return;

        // NOTE : ce n'est PLUS un overlay plein ecran. C'est un petit panneau ancre en
        // bas de l'ecran (bottom sheet) - le fond reste transparent pour que le joueur
        // continue de voir la Serre et les plantes derriere. Un clic en dehors du panneau
        // le referme quand meme (via le calque invisible plein ecran).
        const overlay = document.createElement('div');
        overlay.id = 'capsules-overlay';
        overlay.className = 'capsules-sheet-backdrop';
        overlay.onclick = (e) => { if (e.target === overlay) this.fermerMenuCapsules(); };

        overlay.innerHTML = `
            <div class="capsules-bottom-sheet" onclick="event.stopPropagation()">
                <div class="capsules-sheet-handle"></div>
                <div class="capsules-sheet-header">
                    <h2>📦 Capsules &amp; Objets</h2>
                    <div class="capsules-sheet-header-actions">
                        <button class="btn-capsule-open-all" onclick="window.capsulesManager.ouvrirToutesLesCapsules()">📦 Tout Ouvrir</button>
                        <button class="btn-close-menu" onclick="window.capsulesManager.fermerMenuCapsules()">✖</button>
                    </div>
                </div>
                <div class="capsules-sheet-content">
                    <div id="capsules-grid" class="capsules-grid"></div>
                    <div id="capsules-preview"></div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this.injectStylesMenu();

        // Selectionne automatiquement le premier slot pertinent (capsules en stock si il y en a,
        // sinon le premier objet possede) pour que l'apercu ne soit jamais vide a l'ouverture.
        if (!this._slotSelectionne) {
            const slots = this.getListeSlots();
            const premierUtile = slots.find(s => s.count > 0);
            this._slotSelectionne = premierUtile ? premierUtile.id : (slots[0] ? slots[0].id : null);
        }

        this.refreshMenuUI();

        this._intervalId = setInterval(() => this.refreshMenuUI(), 1000);
    },

    fermerMenuCapsules: function() {
        const overlay = document.getElementById('capsules-overlay');
        if (overlay) overlay.remove();
        if (this._intervalId) {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }
    },

    /**
     * Construit la liste unifiee des "slots" affiches dans la grille : le stock de
     * capsules non ouvertes (1er slot) suivi des 7 objets bonus possibles.
     */
    getListeSlots: function() {
        this.ensureDefaults();
        const inventaire = window.gameState.objetsInventaire || {};
        const buffs = window.gameState.buffsActifs || {};
        const now = Date.now();

        const slots = [{
            id: 'capsuleStock',
            estCapsule: true,
            iconHtml: `<img src="${this.config.icon}" class="capsule-slot-img" onerror="this.remove();">`,
            name: 'Capsule Non Ouverte',
            desc: 'Ouvre une capsule et revele un objet bonus aleatoire.',
            count: window.gameState.capsulesStock || 0,
            actif: false,
            restantSec: 0
        }];

        Object.keys(this.config.items).forEach(id => {
            const item = this.config.items[id];
            const expiresAt = buffs[id] || 0;
            const actif = expiresAt > now;
            slots.push({
                id: id,
                estCapsule: false,
                iconHtml: `<span class="capsule-slot-emoji">${item.icon}</span>`,
                name: item.name,
                desc: item.desc,
                count: inventaire[id] || 0,
                actif: actif,
                restantSec: actif ? Math.ceil((expiresAt - now) / 1000) : 0
            });
        });

        return slots;
    },

    /**
     * Appelee au clic sur une case de la grille : change la selection et rafraichit
     * uniquement l'apercu + la mise en surbrillance (pas besoin de tout reconstruire).
     */
    selectionnerSlot: function(id) {
        this._slotSelectionne = id;
        this.refreshMenuUI();
    },

    /**
     * Action du bouton "UTILISER" : ouvre une capsule si le slot selectionne est le
     * stock de capsules, ou consomme l'objet bonus correspondant sinon.
     */
    utiliserSlotSelectionne: function() {
        if (!this._slotSelectionne) return;

        if (this._slotSelectionne === 'capsuleStock') {
            this.ouvrirCapsule();
        } else {
            this.utiliserObjet(this._slotSelectionne);
        }
    },

    refreshMenuUI: function() {
        if (!document.getElementById('capsules-overlay')) return;
        this.ensureDefaults();

        const grid = document.getElementById('capsules-grid');
        const preview = document.getElementById('capsules-preview');
        if (!grid || !preview) return;

        const slots = this.getListeSlots();

        // Si le slot selectionne n'existe plus (cas improbable), on retombe sur le premier
        if (!slots.some(s => s.id === this._slotSelectionne)) {
            this._slotSelectionne = slots[0] ? slots[0].id : null;
        }

        // --- Grille des icones ---
        grid.innerHTML = slots.map(slot => {
            const selectionne = slot.id === this._slotSelectionne;
            const vide = slot.count <= 0;
            return `
                <div class="capsule-slot ${selectionne ? 'capsule-slot-selected' : ''} ${vide ? 'capsule-slot-vide' : ''}"
                     onclick="window.capsulesManager.selectionnerSlot('${slot.id}')">
                    ${slot.actif ? '<span class="capsule-slot-actif-dot"></span>' : ''}
                    <div class="capsule-slot-icon">${slot.iconHtml}</div>
                    <div class="capsule-slot-count">${slot.count}</div>
                </div>
            `;
        }).join('');

        // --- Panneau d'apercu (bas) ---
        const slot = slots.find(s => s.id === this._slotSelectionne);
        if (!slot) {
            preview.innerHTML = `<div class="capsules-preview-vide">Sélectionnez un objet dans la grille ci-dessus.</div>`;
            return;
        }

        const peutUtiliser = slot.count > 0;
        const mm = Math.floor(slot.restantSec / 60);
        const ss = slot.restantSec % 60;

        preview.innerHTML = `
            <div class="capsules-preview-card">
                <div class="capsules-preview-top">
                    <div class="capsules-preview-icon">${slot.iconHtml}</div>
                    <div class="capsules-preview-info">
                        <div class="capsules-preview-name">${slot.name}</div>
                        <div class="capsules-preview-stats">
                            ${slot.actif ? `<span class="capsules-preview-stat">🕒 ${mm}:${ss.toString().padStart(2, '0')}</span>` : ''}
                            <span class="capsules-preview-stat">📦 x${slot.count}</span>
                        </div>
                    </div>
                </div>
                <div class="capsules-preview-desc">${slot.desc}</div>
                <button class="btn-capsule-utiliser" ${peutUtiliser ? '' : 'disabled'} onclick="window.capsulesManager.utiliserSlotSelectionne()">
                    UTILISER
                </button>
            </div>
        `;
    },

    // --- INIT GLOBAL (appele depuis app.js -> initGame) ---

    init: function() {
        this.ensureDefaults();
        this.creerUIJauge();
        this.creerBoutonBas();
        this.updateJaugeUI();
    },

    // --- STYLES ---

    injectStylesJauge: function() {
        if (document.getElementById('capsule-gauge-styles')) return;
        const style = document.createElement('style');
        style.id = 'capsule-gauge-styles';
        style.textContent = `
            #capsule-gauge-container {
                position: fixed;
                left: 10px;
                top: 50%;
                transform: translateY(-50%);
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 6px;
                z-index: 50;
            }
            .capsule-gauge-icon-wrap {
                position: relative;
                width: 42px;
                height: 42px;
                border-radius: 50%;
                background: var(--panel-bg);
                border: 2px solid var(--neon-green);
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 0 10px rgba(57,255,20,0.3);
                cursor: pointer;
            }
            .capsule-gauge-icon { width: 26px; height: 26px; object-fit: contain; }
            .capsule-stock-badge {
                position: absolute;
                top: -6px;
                right: -6px;
                background: #ff3939;
                color: #fff;
                font-size: 0.65rem;
                font-weight: bold;
                min-width: 16px;
                height: 16px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0 3px;
                border: 1px solid #fff;
            }
            .capsule-gauge-track {
                width: 10px;
                height: 130px;
                background: rgba(0,0,0,0.4);
                border: 1px solid var(--dim-green);
                border-radius: 5px;
                overflow: hidden;
                display: flex;
                align-items: flex-end;
            }
            .capsule-gauge-fill {
                width: 100%;
                height: 0%;
                background: linear-gradient(0deg, var(--dim-green), var(--neon-green));
                box-shadow: 0 0 8px var(--neon-green);
                transition: height 0.3s ease;
            }
            #capsule-bottom-btn {
                position: absolute;
                bottom: 12px;
                left: 50%;
                transform: translateX(-110px); /* Positionne a gauche des boutons nav */
                width: 46px;
                height: 46px;
                border-radius: 50%;
                background: var(--panel-bg);
                border: 2px solid var(--neon-green);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                z-index: 30;
                box-shadow: 0 0 12px rgba(57,255,20,0.35);
                font-size: 1.4rem;
                transition: 0.2s;
            }
            #capsule-bottom-btn:hover {
                box-shadow: 0 0 20px var(--neon-green);
                transform: translateX(-50%) scale(1.08);
            }
        `;
        document.head.appendChild(style);
    },

    injectStylesMenu: function() {
        if (document.getElementById('capsule-menu-styles')) return;
        const style = document.createElement('style');
        style.id = 'capsule-menu-styles';
        style.textContent = `
            /* --- Calque invisible plein ecran (ferme le panneau au clic en dehors,
               mais NE MASQUE PAS le jeu - contrairement a .menu-overlay utilise ailleurs) --- */
            .capsules-sheet-backdrop {
                position: fixed;
                inset: 0;
                z-index: 1000;
                background: transparent;
            }

            /* --- Panneau ancre en bas de l'ecran (bottom sheet), format compact --- */
            .capsules-bottom-sheet {
                position: absolute;
                left: 50%;
                bottom: 0;
                transform: translateX(-50%);
                width: 100%;
                max-width: 480px;
                max-height: 44vh;
                background: var(--panel-bg);
                border: 2px solid #ffd93d;
                border-bottom: none;
                border-radius: 16px 16px 0 0;
                box-shadow: 0 -6px 25px rgba(255, 217, 61, 0.35);
                display: flex;
                flex-direction: column;
                overflow: hidden;
                animation: capsulesSheetSlideUp 0.22s ease-out;
            }
            @keyframes capsulesSheetSlideUp {
                0% { transform: translateX(-50%) translateY(100%); }
                100% { transform: translateX(-50%) translateY(0); }
            }
            .capsules-sheet-handle {
                width: 40px;
                height: 4px;
                background: var(--dim-green);
                border-radius: 2px;
                margin: 8px auto 2px auto;
                flex-shrink: 0;
            }
            .capsules-sheet-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                padding: 6px 14px 8px 14px;
                border-bottom: 1px solid var(--dim-green);
                flex-shrink: 0;
            }
            .capsules-sheet-header h2 {
                color: #ffd93d;
                text-shadow: 0 0 8px #ffd93d;
                margin: 0;
                font-size: 0.9rem;
                white-space: nowrap;
            }
            .capsules-sheet-header-actions {
                display: flex;
                align-items: center;
                gap: 8px;
                flex-shrink: 0;
            }
            .btn-capsule-open-all {
                background: rgba(255, 217, 61, 0.12);
                border: 1px solid #ffd93d;
                color: #ffd93d;
                font-size: 0.68rem;
                font-weight: bold;
                padding: 5px 9px;
                border-radius: 5px;
                cursor: pointer;
                white-space: nowrap;
                transition: 0.15s;
            }
            .btn-capsule-open-all:hover { background: rgba(255, 217, 61, 0.25); box-shadow: 0 0 8px #ffd93d; }
            .capsules-sheet-header .btn-close-menu {
                background: transparent;
                border: none;
                color: var(--text-color);
                font-size: 1.2rem;
                cursor: pointer;
                line-height: 1;
            }
            .capsules-sheet-content {
                flex: 1;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
            }

            /* --- Grille d'icones : juste les icones les unes a cote des autres --- */
            .capsules-grid {
                display: grid;
                grid-template-columns: repeat(6, 1fr);
                gap: 6px;
                padding: 10px 14px 0 14px;
                flex-shrink: 0;
            }
            .capsule-slot {
                position: relative;
                aspect-ratio: 1;
                background: rgba(0,0,0,0.35);
                border: 2px solid var(--dim-green);
                border-radius: 8px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 1px;
                cursor: pointer;
                transition: 0.15s;
                overflow: hidden;
            }
            .capsule-slot:hover { border-color: #ffd93d; }
            .capsule-slot.capsule-slot-selected {
                border-color: #ffd93d;
                box-shadow: 0 0 10px rgba(255, 217, 61, 0.7);
                background: rgba(255, 217, 61, 0.1);
            }
            .capsule-slot.capsule-slot-vide {
                opacity: 0.4;
                filter: grayscale(0.6);
            }
            .capsule-slot-icon {
                font-size: 1.2rem;
                line-height: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 20px;
            }
            .capsule-slot-emoji { font-size: 1.2rem; }
            .capsule-slot-img { width: 20px; height: 20px; object-fit: contain; }
            .capsule-slot-count {
                font-size: 0.6rem;
                font-weight: bold;
                color: var(--neon-green);
                background: rgba(0,0,0,0.5);
                padding: 0 3px;
                border-radius: 3px;
            }
            .capsule-slot-actif-dot {
                position: absolute;
                top: 3px;
                right: 3px;
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: var(--neon-green);
                box-shadow: 0 0 6px var(--neon-green);
            }

            /* --- Panneau d'apercu : ce que fait l'objet selectionne --- */
            .capsules-preview-vide {
                text-align: center;
                color: #666;
                font-size: 0.75rem;
                padding: 14px;
                font-style: italic;
            }
            .capsules-preview-card {
                margin: 10px 14px 14px 14px;
                background: rgba(0,0,0,0.35);
                border: 1px solid #ffd93d;
                border-radius: 8px;
                padding: 10px;
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            .capsules-preview-top {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .capsules-preview-icon {
                width: 38px;
                height: 38px;
                flex-shrink: 0;
                background: rgba(0,0,0,0.4);
                border: 1px solid #ffd93d;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.4rem;
            }
            .capsules-preview-icon img { width: 26px; height: 26px; object-fit: contain; }
            .capsules-preview-info { display: flex; flex-direction: column; gap: 3px; flex: 1; }
            .capsules-preview-name { font-weight: bold; color: #fff; font-size: 0.85rem; }
            .capsules-preview-stats { display: flex; gap: 8px; }
            .capsules-preview-stat {
                font-size: 0.68rem;
                color: #ffd93d;
                background: rgba(255, 217, 61, 0.1);
                border: 1px solid rgba(255, 217, 61, 0.3);
                padding: 1px 6px;
                border-radius: 10px;
            }
            .capsules-preview-desc {
                font-size: 0.75rem;
                color: #ddd;
                line-height: 1.35;
                background: rgba(0,0,0,0.25);
                border-left: 3px solid #ffd93d;
                padding: 6px 8px;
                border-radius: 4px;
            }
            .btn-capsule-utiliser {
                background: linear-gradient(180deg, #ff5757, #8a1f1f);
                border: 1px solid #ffb0b0;
                border-bottom: 3px solid #5c1414;
                color: #fff;
                font-weight: bold;
                font-size: 0.85rem;
                letter-spacing: 1px;
                padding: 9px;
                border-radius: 6px;
                cursor: pointer;
                transition: 0.15s;
            }
            .btn-capsule-utiliser:hover:not(:disabled) { filter: brightness(1.15); transform: translateY(-1px); }
            .btn-capsule-utiliser:active:not(:disabled) { transform: translateY(2px); border-bottom-width: 0; }
            .btn-capsule-utiliser:disabled { background: #333; border-color: #555; color: #777; cursor: not-allowed; }

            @media screen and (max-width: 480px) {
                .capsules-grid { grid-template-columns: repeat(5, 1fr); }
                .capsules-bottom-sheet { max-height: 48vh; }
            }
        `;
        document.head.appendChild(style);
    }
};