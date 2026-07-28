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
        const routeIndex = (window.gameState.currentRoute || 1) - 1;
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
                window.afficherToast(`📦 +${capsulesGagnees} Capsule${capsulesGagnees > 1 ? 's' : ''} Organique${capsulesGagnees > 1 ? 's' : ''} !`, 'info');
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

    ouvrirToutesLesCapsules: function() {
        const total = window.gameState.capsulesStock || 0;
        for (let i = 0; i < total; i++) this.ouvrirCapsule();
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

        const overlay = document.createElement('div');
        overlay.id = 'capsules-overlay';
        overlay.className = 'menu-overlay';
        overlay.onclick = (e) => { if (e.target === overlay) this.fermerMenuCapsules(); };

        overlay.innerHTML = `
            <div class="menu-content" style="border-color:#ffd93d; box-shadow:0 0 30px #ffd93d;">
                <div class="menu-header">
                    <h2 style="color:#ffd93d; text-shadow:0 0 8px #ffd93d;">📦 Capsules Organiques Scellées</h2>
                    <button class="btn-close-menu" onclick="window.capsulesManager.fermerMenuCapsules()">✖</button>
                </div>
                <div class="menu-body">
                    <div id="capsules-stock-section"></div>
                    <div id="capsules-items-section"></div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this.injectStylesMenu();
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

    refreshMenuUI: function() {
        if (!document.getElementById('capsules-overlay')) return;
        this.ensureDefaults();

        const stockSection = document.getElementById('capsules-stock-section');
        const itemsSection = document.getElementById('capsules-items-section');
        if (!stockSection || !itemsSection) return;

        const stock = window.gameState.capsulesStock || 0;
        stockSection.innerHTML = `
            <div class="capsule-stock-card">
                <div class="capsule-stock-info">
                    <img src="${this.config.icon}" class="capsule-stock-icon" onerror="this.remove();">
                    <span>Capsules non ouvertes : <strong>${stock}</strong></span>
                </div>
                <div class="capsule-stock-actions">
                    <button class="btn-mutation-trigger" style="width:auto; padding:8px 14px;" ${stock <= 0 ? 'disabled' : ''} onclick="window.capsulesManager.ouvrirCapsule()">Ouvrir 1</button>
                    <button class="btn-mutation-trigger" style="width:auto; padding:8px 14px;" ${stock <= 0 ? 'disabled' : ''} onclick="window.capsulesManager.ouvrirToutesLesCapsules()">Tout Ouvrir</button>
                </div>
            </div>
        `;

        const inventaire = window.gameState.objetsInventaire || {};
        const buffs = window.gameState.buffsActifs || {};
        const now = Date.now();
        const ids = Object.keys(this.config.items);
        const idsPertinents = ids.filter(id => (inventaire[id] > 0) || (buffs[id] && buffs[id] > now));

        let html = '<h4 style="color:#ffd93d; margin:15px 0 10px; border-bottom:1px dashed var(--dim-green); padding-bottom:5px;">Vos Objets</h4>';

        if (idsPertinents.length === 0) {
            html += `<div style="color:#666; font-size:0.8rem; text-align:center; padding:10px;">Aucun objet pour le moment. Ouvrez des capsules !</div>`;
        } else {
            idsPertinents.forEach(id => {
                const item = this.config.items[id];
                const count = inventaire[id] || 0;
                const expiresAt = buffs[id] || 0;
                const actif = expiresAt > now;
                const restant = actif ? Math.ceil((expiresAt - now) / 1000) : 0;
                const mm = Math.floor(restant / 60);
                const ss = restant % 60;

                html += `
                    <div class="capsule-item-card ${actif ? 'capsule-item-actif' : ''}">
                        <div class="capsule-item-top">
                            <span class="capsule-item-icon">${item.icon}</span>
                            <div class="capsule-item-info">
                                <span class="capsule-item-name">${item.name}</span>
                                <span class="capsule-item-desc">${item.desc}</span>
                            </div>
                        </div>
                        <div class="capsule-item-bottom">
                            <span class="capsule-item-count">Possédés : ${count}</span>
                            ${actif ? `<span class="capsule-item-timer">🕒 ${mm}:${ss.toString().padStart(2, '0')}</span>` : ''}
                            <button class="btn-mutation" ${count <= 0 ? 'disabled' : ''} onclick="window.capsulesManager.utiliserObjet('${id}')">
                                ${actif ? 'Utiliser (+1min)' : 'Utiliser (1min)'}
                            </button>
                        </div>
                    </div>
                `;
            });
        }

        itemsSection.innerHTML = html;
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
            /* Styles de base de l'overlay (dupliques de menu.js pour rendre ce module
               autonome : l'icone des Capsules est visible des le chargement de la page,
               donc on ne peut pas compter sur menu.js pour les avoir deja injectes) */
            .menu-overlay {
                position: fixed;
                top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(5, 10, 5, 0.95);
                z-index: 1000;
                display: flex;
                justify-content: center;
                align-items: center;
                backdrop-filter: blur(5px);
            }
            .menu-content {
                background: var(--panel-bg);
                border: 2px solid var(--neon-green);
                border-radius: 10px;
                width: 90%;
                max-width: 600px;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 0 30px var(--neon-green);
                display: flex;
                flex-direction: column;
            }
            .menu-header {
                padding: 15px;
                border-bottom: 1px solid var(--dim-green);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .menu-header h2 {
                color: var(--neon-green);
                text-shadow: 0 0 5px var(--neon-green);
                margin: 0;
                font-size: 1.1rem;
            }
            .btn-close-menu {
                background: transparent;
                border: none;
                color: var(--text-color);
                font-size: 1.5rem;
                cursor: pointer;
            }
            .menu-body { padding: 15px; }

            .capsule-stock-card {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                background: rgba(255, 217, 61, 0.08);
                border: 1px solid #ffd93d;
                border-radius: 6px;
                padding: 12px;
                margin-bottom: 10px;
                flex-wrap: wrap;
            }
            .capsule-stock-info { display: flex; align-items: center; gap: 10px; color: #fff; font-size: 0.85rem; }
            .capsule-stock-icon { width: 28px; height: 28px; object-fit: contain; }
            .capsule-stock-actions { display: flex; gap: 8px; }

            .capsule-item-card {
                background: rgba(0,0,0,0.3);
                border: 1px solid var(--dim-green);
                border-radius: 6px;
                padding: 10px;
                margin-bottom: 10px;
                display: flex;
                flex-direction: column;
                gap: 8px;
                transition: 0.2s;
            }
            .capsule-item-card.capsule-item-actif {
                border-color: var(--neon-green);
                box-shadow: 0 0 10px rgba(57,255,20,0.3);
            }
            .capsule-item-top { display: flex; align-items: center; gap: 10px; }
            .capsule-item-icon { font-size: 1.5rem; }
            .capsule-item-info { display: flex; flex-direction: column; }
            .capsule-item-name { font-weight: bold; color: #fff; font-size: 0.85rem; }
            .capsule-item-desc { font-size: 0.72rem; color: #ccc; }
            .capsule-item-bottom {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                font-size: 0.75rem;
            }
            .capsule-item-count { color: #999; }
            .capsule-item-timer { color: var(--neon-green); font-weight: bold; }
        `;
        document.head.appendChild(style);
    }
};