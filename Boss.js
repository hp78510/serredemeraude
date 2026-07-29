/* Boss.js - Combat contre le Boss "Cœur de la Serre d'Émeraude" */

window.bossManager = {

    config: {
        pvBase: 5000,
        pvGrowth: 1.85,          // PV multiplies par ce facteur a chaque niveau (montee rapide, il faut suivre avec ses degats)
        recompenseGemmes: 200,
        gainNiveauMax: 5,        // Nombre de niveaux de joueur debloques par victoire
        cooldownMs: 5 * 60 * 1000,   // 5 minutes entre deux tentatives
        dureeCombatMs: 2 * 60 * 1000, // 2 minutes de combat max
        image: "./images/boss/Coeur de la Serre d’Emeraude.png",
        fond: "./images/fonds/coeur de la serre.png"
    },

    // --- Etat ephemere du combat (non sauvegarde, reinitialise a chaque rechargement) ---
    enCombat: false,
    combatGagne: false,
    pvActuel: 0,
    pvMax: 0,
    finCombatTimestamp: 0,
    _timerInterval: null,
    _iconRefreshInterval: null,

    // --- ETAT / SAUVEGARDE ---

    ensureDefaults: function() {
        if (!window.gameState) return;
        if (!window.gameState.boss) window.gameState.boss = {};
        if (typeof window.gameState.boss.niveau !== 'number') window.gameState.boss.niveau = 1;
        if (typeof window.gameState.boss.derniereTentative !== 'number') window.gameState.boss.derniereTentative = 0;
        if (typeof window.gameState.niveauMaxDebloque !== 'number') window.gameState.niveauMaxDebloque = 10;
    },

    getPvPourNiveau: function(niveau) {
        return Math.floor(this.config.pvBase * Math.pow(this.config.pvGrowth, niveau - 1));
    },

    getTempsRestantCooldown: function() {
        this.ensureDefaults();
        const elapsed = Date.now() - window.gameState.boss.derniereTentative;
        return Math.max(0, this.config.cooldownMs - elapsed);
    },

    peutCombattre: function() {
        return this.getTempsRestantCooldown() <= 0 && !this.enCombat;
    },

    formatTemps: function(ms) {
        const totalSec = Math.ceil(ms / 1000);
        const min = Math.floor(totalSec / 60);
        const sec = totalSec % 60;
        return `${min}:${sec.toString().padStart(2, '0')}`;
    },

    // --- ICONE (aside route-nav) ---

    demarrerRafraichissementIcone: function() {
        if (this._iconRefreshInterval) return;
        this._iconRefreshInterval = setInterval(() => this.rafraichirIcone(), 1000);
        this.rafraichirIcone();
    },

    rafraichirIcone: function() {
        const btn = document.getElementById('btn-boss-fight');
        const badge = document.getElementById('boss-icon-cooldown');
        if (!btn || !badge) return;

        const restant = this.getTempsRestantCooldown();
        const estPret = restant <= 0 && !this.enCombat;

        if (restant > 0 && !this.enCombat) {
            btn.classList.add('boss-icon-cooldown-actif');
            badge.style.display = 'flex';
            badge.textContent = this.formatTemps(restant);
        } else {
            btn.classList.remove('boss-icon-cooldown-actif');
            badge.style.display = 'none';
        }

        // Animation d'appel : pulse lorsque le boss est disponible (hors cooldown, hors combat)
        btn.classList.toggle('boss-pret', estPret);
    },

    // --- UI : POPUP D'INFORMATIONS AVANT COMBAT ---

    ouvrirInfoBoss: function() {
        this.ensureDefaults();
        if (document.getElementById('boss-info-overlay')) return;

        const niveau = window.gameState.boss.niveau;
        const pv = this.getPvPourNiveau(niveau);
        const cooldownRestant = this.getTempsRestantCooldown();
        const disponible = cooldownRestant <= 0 && !this.enCombat;
        const niveauMaxActuel = window.gameState.niveauMaxDebloque || 10;
        const niveauMaxFutur = niveauMaxActuel + this.config.gainNiveauMax;

        const overlay = document.createElement('div');
        overlay.id = 'boss-info-overlay';
        overlay.className = 'menu-overlay';
        overlay.onclick = (e) => { if (e.target === overlay) this.fermerInfoBoss(); };

        overlay.innerHTML = `
            <div class="menu-content boss-info-content">
                <div class="menu-header">
                    <h2>👑 Cœur de la Serre d'Émeraude</h2>
                    <button class="btn-close-menu" onclick="window.bossManager.fermerInfoBoss()">✖</button>
                </div>
                <div class="boss-info-body">
                    <img src="${this.config.image}" class="boss-info-image" alt="Boss" onerror="this.style.display='none'">
                    <div class="boss-info-stat"><span>Niveau</span><span class="boss-info-value">${niveau}</span></div>
                    <div class="boss-info-stat"><span>Points de vie</span><span class="boss-info-value">${pv.toLocaleString()} ❤️</span></div>
                    <div class="boss-info-stat"><span>Durée du combat</span><span class="boss-info-value">${this.formatTemps(this.config.dureeCombatMs)}</span></div>
                    <div class="boss-info-stat"><span>Récompense</span><span class="boss-info-value">${this.config.recompenseGemmes} 💎</span></div>
                    <div class="boss-info-stat boss-info-stat-lock"><span>🔒 Plafond de niveau</span><span class="boss-info-value">${niveauMaxActuel} ➜ ${niveauMaxFutur}</span></div>
                    ${!disponible ? `<div class="boss-cooldown-msg">⏳ Prochaine tentative possible dans ${this.formatTemps(cooldownRestant)}</div>` : ''}
                    <div class="boss-info-actions">
                        <button class="btn-back" onclick="window.bossManager.fermerInfoBoss()">⬅ Retour</button>
                        <button class="btn-boss-attack" ${disponible ? '' : 'disabled'} onclick="window.bossManager.demarrerCombat()">⚔️ ATTACK!</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this.injectStyles();
    },

    fermerInfoBoss: function() {
        const overlay = document.getElementById('boss-info-overlay');
        if (overlay) overlay.remove();
    },

    // --- COMBAT ---

    demarrerCombat: function() {
        if (!this.peutCombattre()) return;
        this.ensureDefaults();
        this.fermerInfoBoss();

        window.gameState.boss.derniereTentative = Date.now();
        window.sauvegarderProgression();
        this.rafraichirIcone();

        this.enCombat = true;
        this.combatGagne = false;
        this.pvMax = this.getPvPourNiveau(window.gameState.boss.niveau);
        this.pvActuel = this.pvMax;
        this.finCombatTimestamp = Date.now() + this.config.dureeCombatMs;
        this.combatDebutTimestamp = Date.now();

        // Suivi des degats infliges pour le compteur de DPS (fenetre glissante)
        this._degatsRecents = [];

        // Masquer les symbiotes actifs pendant le combat (seul le joueur peut infliger des degats)
        if (window.symbiotesManager && Array.isArray(window.symbiotesManager.actifs)) {
            window.symbiotesManager.actifs.forEach(s => {
                if (s.element) s.element.style.display = 'none';
            });
        }

        this.afficherArenaCombat();

        this._timerInterval = setInterval(() => this.tickCombat(), 200);
    },

    tickCombat: function() {
        if (!this.enCombat) return;

        const tempsRestant = Math.max(0, this.finCombatTimestamp - Date.now());
        this.mettreAJourUICombat(tempsRestant);

        if (this.pvActuel <= 0) {
            this.terminerCombat(true);
        } else if (tempsRestant <= 0) {
            this.terminerCombat(false);
        }
    },

    /**
     * Appelee par app.js (handleGlobalClick) quand un clic survient pendant le combat.
     * Reutilise le calcul de degats normal du secateur (avec crit), applique directement au boss.
     */
    gererClic: function(event) {
        if (!this.enCombat || this.pvActuel <= 0) return;

        const damage = window.calculerDegatsSecateur ? window.calculerDegatsSecateur() : 1;
        this.pvActuel = Math.max(0, this.pvActuel - damage);

        // Suivi pour le compteur de DPS (fenetre glissante)
        this._degatsRecents.push({ t: Date.now(), montant: damage });

        this.afficherDegatsFlottants(damage, event);
        this.mettreAJourUICombat(Math.max(0, this.finCombatTimestamp - Date.now()));

        if (this.pvActuel <= 0) {
            this.terminerCombat(true);
        }
    },

    /**
     * Calcule le DPS "en direct" sur une fenetre glissante de 2 secondes, a partir
     * des coups recents enregistres dans gererClic(). Retombe naturellement a 0
     * si aucun coup n'a ete porte depuis 2 secondes (feedback immediat pour le joueur).
     */
    calculerDpsActuel: function() {
        const fenetreSec = 2;
        const maintenant = Date.now();

        // Nettoyage des entrees trop anciennes
        this._degatsRecents = (this._degatsRecents || []).filter(e => maintenant - e.t <= fenetreSec * 1000);

        if (this._degatsRecents.length === 0) return 0;

        const sommeDegats = this._degatsRecents.reduce((sum, e) => sum + e.montant, 0);

        // Si le combat vient de commencer depuis moins de 2s, on divise par le temps
        // reellement ecoule plutot que par la fenetre complete (evite de sous-estimer le DPS)
        const tempsEcouleCombat = (maintenant - (this.combatDebutTimestamp || maintenant)) / 1000;
        const diviseur = Math.max(0.001, Math.min(fenetreSec, tempsEcouleCombat));

        return Math.floor(sommeDegats / diviseur);
    },

    terminerCombat: function(victoire) {
        if (!this.enCombat) return;
        this.enCombat = false;
        this.combatGagne = victoire;

        if (this._timerInterval) {
            clearInterval(this._timerInterval);
            this._timerInterval = null;
        }

        this.afficherResultatCombat(victoire);
    },

    recolterRecompense: function() {
        this.ensureDefaults();
        if (window.economie) {
            window.economie.ajouterGemmes(this.config.recompenseGemmes);
        }
        window.gameState.boss.niveau += 1;

        // Releve le plafond de niveau du joueur et debloque immediatement toute XP deja en attente
        window.gameState.niveauMaxDebloque = (window.gameState.niveauMaxDebloque || 10) + this.config.gainNiveauMax;
        if (window.verifierMonteeNiveau) window.verifierMonteeNiveau();
        if (window.updateHeaderUI) window.updateHeaderUI();

        window.sauvegarderProgression();

        this.fermerArenaCombat();
    },

    quitterArena: function() {
        this.fermerArenaCombat();
    },

    // --- RENDU DE L'ARENE (remplace le decor du jeu pendant le combat) ---

    afficherArenaCombat: function() {
        const serreTab = document.getElementById('tab-serre');
        if (!serreTab) return;

        const overlay = document.createElement('div');
        overlay.id = 'boss-arena-overlay';
        overlay.style.backgroundImage = `url('${this.config.fond}')`;

        overlay.innerHTML = `
            <div class="boss-arena-hud">
                <div class="boss-arena-top-row">
                    <button class="btn-boss-quit" onclick="event.stopPropagation(); window.bossManager.quitterArena()">🏃 Quitter</button>
                    <div class="boss-arena-timer" id="boss-arena-timer">${this.formatTemps(this.config.dureeCombatMs)}</div>
                </div>
                <div class="boss-arena-hpbar-track">
                    <div class="boss-arena-hpbar-fill" id="boss-arena-hpbar-fill" style="width:100%;"></div>
                </div>
                <div class="boss-arena-hp-text" id="boss-arena-hp-text">${this.pvActuel.toLocaleString()} / ${this.pvMax.toLocaleString()} PV</div>
                <div class="boss-arena-dps" id="boss-arena-dps">⚡ 0 DPS</div>
            </div>
            <img src="${this.config.image}" class="boss-arena-image" id="boss-arena-image" alt="Boss" onerror="this.style.display='none'">
            <div id="boss-arena-result"></div>
        `;

        serreTab.appendChild(overlay);
    },

    mettreAJourUICombat: function(tempsRestantMs) {
        const timerEl = document.getElementById('boss-arena-timer');
        const fillEl = document.getElementById('boss-arena-hpbar-fill');
        const hpTextEl = document.getElementById('boss-arena-hp-text');
        const dpsEl = document.getElementById('boss-arena-dps');

        if (timerEl) timerEl.textContent = this.formatTemps(tempsRestantMs);
        if (fillEl) {
            const pourcentage = Math.max(0, Math.min(100, (this.pvActuel / this.pvMax) * 100));
            fillEl.style.width = `${pourcentage}%`;
            fillEl.style.backgroundColor = pourcentage < 25 ? '#ff3939' : (pourcentage < 55 ? '#ffff39' : '');
        }
        if (hpTextEl) hpTextEl.textContent = `${Math.max(0, this.pvActuel).toLocaleString()} / ${this.pvMax.toLocaleString()} PV`;
        if (dpsEl) dpsEl.textContent = `⚡ ${this.calculerDpsActuel().toLocaleString()} DPS`;
    },

    afficherResultatCombat: function(victoire) {
        const resultDiv = document.getElementById('boss-arena-result');
        if (!resultDiv) return;

        if (victoire) {
            resultDiv.innerHTML = `
                <div class="boss-result-box boss-result-victoire">
                    <div class="boss-result-title">🏆 VICTOIRE !</div>
                    <div class="boss-result-sub">+${this.config.recompenseGemmes} 💎 Gemmes<br>🔒 +${this.config.gainNiveauMax} niveaux débloqués !</div>
                    <button class="btn-boss-attack" onclick="window.bossManager.recolterRecompense()">💎 Récolter la récompense</button>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `
                <div class="boss-result-box boss-result-defaite">
                    <div class="boss-result-title">💀 DÉFAITE</div>
                    <div class="boss-result-sub">Le boss a résisté. Réessayez dans ${this.formatTemps(this.config.cooldownMs)}.</div>
                    <button class="btn-back" onclick="window.bossManager.quitterArena()">⬅ Retour</button>
                </div>
            `;
        }
    },

    fermerArenaCombat: function() {
        const overlay = document.getElementById('boss-arena-overlay');
        if (overlay) overlay.remove();

        // Reafficher les symbiotes actifs
        if (window.symbiotesManager && Array.isArray(window.symbiotesManager.actifs)) {
            window.symbiotesManager.actifs.forEach(s => {
                if (s.element) s.element.style.display = '';
            });
        }

        this.enCombat = false;
        this.combatGagne = false;
        this.rafraichirIcone();
    },

    afficherDegatsFlottants: function(montant, event) {
        const arena = document.getElementById('boss-arena-overlay');
        if (!arena) return;

        const rect = arena.getBoundingClientRect();

        // Extraction correcte des coordonnees, que l'evenement soit tactile (touchstart/touchmove,
        // ou l'evenement original ait deja ete consomme) ou souris. Sans ce test, event.clientX
        // est undefined sur mobile (les touch events exposent leurs coordonnees via .touches[0]),
        // et le chiffre retombait toujours au centre de l'arene.
        const touch = event && event.touches && event.touches[0];
        const clientX = touch ? touch.clientX : (event && event.clientX);
        const clientY = touch ? touch.clientY : (event && event.clientY);

        const x = (typeof clientX === 'number') ? clientX : (rect.left + rect.width / 2);
        const y = (typeof clientY === 'number') ? clientY : (rect.top + rect.height / 2);

        // Decalage vers le haut : le chiffre apparait au-dessus du point d'impact plutot que
        // pile dessus, pour ne pas etre masque par le doigt sur mobile pendant l'appui.
        // Valeur augmentee (65 -> 100) car un doigt/pouce couvre facilement 60-80px sur mobile.
        const decalageVertical = 100;

        const el = document.createElement('div');
        el.className = 'boss-float-dmg';
        el.textContent = `-${montant}`;
        el.style.left = `${x}px`;
        el.style.top = `${y - decalageVertical}px`;
        document.body.appendChild(el);

        setTimeout(() => {
            if (el.parentNode) el.parentNode.removeChild(el);
        }, 900);
    },

    // --- STYLES ---

    injectStyles: function() {
        if (document.getElementById('boss-styles')) return;
        const style = document.createElement('style');
        style.id = 'boss-styles';
        style.textContent = `
            /* Styles de base de l'overlay (dupliques de menu.js pour rendre ce module
               autonome : l'icone du boss est accessible directement sans passer par le
               menu principal, donc on ne peut pas compter sur menu.js pour les injecter) */
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
            .btn-back {
                background: rgba(57, 255, 20, 0.1);
                border: 1px solid var(--neon-green);
                color: var(--neon-green);
                padding: 5px 15px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 1rem;
            }

            /* Icone dans le panneau des routes */
            .boss-icon-btn {
                position: relative;
                background: rgba(0,0,0,0.3);
                border: 2px solid #ff5757;
                border-radius: 50%;
                width: 55px;
                height: 55px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                margin-bottom: 10px;
                box-shadow: 0 0 12px rgba(255, 87, 87, 0.4);
                transition: 0.2s;
            }
            .boss-icon-btn:hover {
                box-shadow: 0 0 20px rgba(255, 87, 87, 0.8);
                transform: scale(1.08);
            }
            .boss-icon-btn img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            .boss-icon-cooldown {
                display: none;
                position: absolute;
                inset: 0;
                background: rgba(0,0,0,0.65);
                color: #fff;
                font-size: 0.65rem;
                font-weight: bold;
                align-items: center;
                justify-content: center;
                text-align: center;
                border-radius: 50%;
            }
            .boss-icon-btn.boss-icon-cooldown-actif {
                border-color: var(--dim-green);
                box-shadow: none;
            }

            /* Animation d'appel : signale que le boss est disponible (hors cooldown, hors combat) */
            .boss-icon-btn.boss-pret {
                animation: bossPretPulse 1.4s ease-in-out infinite;
            }
            @keyframes bossPretPulse {
                0%, 100% {
                    box-shadow: 0 0 12px rgba(255, 87, 87, 0.4);
                    transform: scale(1);
                }
                50% {
                    box-shadow: 0 0 26px rgba(255, 87, 87, 0.95), 0 0 45px rgba(255, 87, 87, 0.5);
                    transform: scale(1.08);
                }
            }

            @media screen and (max-width: 768px) {
                .boss-icon-btn {
                    width: 45px;
                    height: 45px;
                }
            }

            /* Popup d'informations */
            .boss-info-content { border-color: #ff5757; box-shadow: 0 0 30px #ff5757; }
            .boss-info-body { padding: 20px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
            .boss-info-image {
                width: 110px;
                height: 110px;
                object-fit: cover;
                border-radius: 50%;
                border: 3px solid #ff5757;
                box-shadow: 0 0 20px rgba(255, 87, 87, 0.6);
                margin-bottom: 10px;
            }
            .boss-info-stat {
                width: 100%;
                max-width: 320px;
                display: flex;
                justify-content: space-between;
                background: rgba(0,0,0,0.3);
                border: 1px solid var(--dim-green);
                border-radius: 4px;
                padding: 8px 12px;
                font-size: 0.85rem;
            }
            .boss-info-value { color: var(--neon-green); font-weight: bold; }
            .boss-info-stat-lock { border-color: #ffb347; }
            .boss-info-stat-lock .boss-info-value { color: #ffb347; }
            .boss-cooldown-msg {
                color: #ffb347;
                font-size: 0.8rem;
                text-align: center;
                margin-top: 5px;
            }
            .boss-info-actions {
                display: flex;
                gap: 10px;
                margin-top: 15px;
                width: 100%;
                max-width: 320px;
            }
            .btn-boss-attack {
                flex: 1;
                background: linear-gradient(180deg, #ff5757, #8a1f1f);
                border: 1px solid #ffb0b0;
                border-bottom: 3px solid #5c1414;
                color: #fff;
                font-weight: bold;
                font-size: 0.9rem;
                padding: 10px;
                border-radius: 5px;
                cursor: pointer;
                transition: 0.15s;
            }
            .btn-boss-attack:hover:not(:disabled) { filter: brightness(1.15); transform: translateY(-1px); }
            .btn-boss-attack:active:not(:disabled) { transform: translateY(2px); border-bottom-width: 0; }
            .btn-boss-attack:disabled { background: #333; border-color: #555; color: #777; cursor: not-allowed; }

            /* Arene de combat (remplace le decor de la serre) */
            #boss-arena-overlay {
                position: absolute;
                inset: 0;
                z-index: 40;
                background-size: cover;
                background-position: center;
                background-color: #0a0505;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                cursor: crosshair;
            }
            .boss-arena-hud {
                position: absolute;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                width: 85%;
                max-width: 420px;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 6px;
                z-index: 45;
            }
            .boss-arena-top-row {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 15px;
                width: 100%;
            }
            .boss-arena-timer {
                background: rgba(0,0,0,0.6);
                border: 1px solid #ff5757;
                color: #ffb0b0;
                font-weight: bold;
                font-size: 1rem;
                padding: 4px 14px;
                border-radius: 15px;
                box-shadow: 0 0 10px rgba(255, 87, 87, 0.4);
            }
            .btn-boss-quit {
                background: rgba(255, 57, 57, 0.6) !important;
                border: 2px solid #ff3939 !important;
                color: #fff !important;
                padding: 8px 16px !important;
                border-radius: 12px;
                font-size: 0.9rem;
                font-weight: bold;
                cursor: pointer;
                transition: 0.2s;
                z-index: 9999 !important;
                position: relative;
                pointer-events: auto !important;
            }
            .btn-boss-quit:hover {
                background: rgba(255, 57, 57, 0.4);
                box-shadow: 0 0 10px #ff3939;
            }
            .boss-arena-hpbar-track {
                width: 100%;
                height: 16px;
                background: rgba(0,0,0,0.6);
                border: 1px solid #ff5757;
                border-radius: 8px;
                overflow: hidden;
            }
            .boss-arena-hpbar-fill {
                height: 100%;
                background: #39ff14;
                transition: width 0.2s ease-out, background-color 0.2s;
                box-shadow: 0 0 10px rgba(57, 255, 20, 0.6);
            }
            .boss-arena-hp-text {
                background: rgba(0,0,0,0.5);
                color: #fff;
                font-size: 0.8rem;
                font-weight: bold;
                padding: 2px 10px;
                border-radius: 10px;
            }
            .boss-arena-dps {
                background: rgba(0,0,0,0.55);
                border: 1px solid #ffb347;
                color: #ffb347;
                font-size: 0.85rem;
                font-weight: bold;
                padding: 3px 14px;
                border-radius: 10px;
                box-shadow: 0 0 8px rgba(255, 179, 71, 0.4);
            }
            .boss-arena-image {
                width: 220px;
                height: 220px;
                object-fit: contain;
                filter: drop-shadow(0 0 25px rgba(255, 87, 87, 0.6));
                pointer-events: none;
                animation: bossFloat 3s ease-in-out infinite;
            }
            @keyframes bossFloat {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-12px); }
            }

            #boss-arena-result {
                position: absolute;
                inset: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 50;
            }
            .boss-result-box {
                background: var(--panel-bg);
                border-radius: 10px;
                padding: 25px 30px;
                text-align: center;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 10px;
                max-width: 320px;
            }
            .boss-result-victoire { border: 2px solid var(--neon-green); box-shadow: 0 0 30px var(--neon-green); }
            .boss-result-defaite { border: 2px solid #ff3939; box-shadow: 0 0 30px #ff3939; }
            .boss-result-title { font-size: 1.4rem; font-weight: bold; color: #fff; }
            .boss-result-sub { font-size: 0.85rem; color: #ccc; margin-bottom: 10px; }

            .boss-float-dmg {
                position: fixed;
                z-index: 4000;
                transform: translate(-50%, 0);
                font-family: 'Courier New', monospace;
                font-weight: bold;
                font-size: 2rem;
                color: #ff5757;
                text-shadow:
                    0 0 6px rgba(255, 87, 87, 0.95),
                    -2px -2px 0 #000,
                    2px -2px 0 #000,
                    -2px 2px 0 #000,
                    2px 2px 0 #000;
                pointer-events: none;
                animation: bossFloatDmg 0.9s ease-out forwards;
            }
            @keyframes bossFloatDmg {
                0% { opacity: 1; transform: translate(-50%, 0) scale(0.9); }
                100% { opacity: 0; transform: translate(-50%, -55px) scale(1.15); }
            }
        `;
        document.head.appendChild(style);
    }
};

// Raccourci global appele par le bouton HTML
window.ouvrirBoss = function() {
    window.bossManager.ouvrirInfoBoss();
};

// Injecter les styles immediatement (l'icone est visible des le chargement de la page,
// pas seulement a l'ouverture du popup) et demarrer le rafraichissement du badge de cooldown
window.bossManager.injectStyles();
document.addEventListener('DOMContentLoaded', () => {
    window.bossManager.demarrerRafraichissementIcone();
});
