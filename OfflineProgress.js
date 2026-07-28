/* OfflineProgress.js - Systeme de Progression Hors-Ligne (simule les gains des symbiotes pendant l'absence) */

window.offlineManager = {

    config: {
        storageKey: 'laSerreEmeraude_lastTimestamp',
        maxOfflineSeconds: 8 * 60 * 60,   // Plafond : 8h max de gains hors-ligne
        minOfflineSeconds: 30,            // En dessous de 30s, on ne calcule rien (evite le bruit d'un simple F5)

        // Rendement hors-ligne : le joueur absent ne doit JAMAIS recolter autant qu'en jeu actif
        // (standard dans les jeux idle : 50% est une valeur courante et equilibree).
        efficaciteHorsLigne: 0.5,

        // GARDE-FOU CRITIQUE : peu importe la puissance du build (upgrades, mutations, evolution,
        // capsules...), on ne peut jamais depasser ce nombre de plantes recoltees par seconde
        // d'absence, PAR SYMBIOTE ACTIF. Plus le joueur a de symbiotes actifs, plus le plafond
        // global augmente proportionnellement (coherent : chaque symbiote contribue a la recolte).
        // Sans ce plafond, un build tres optimise sur une route a faibles PV produit des nombres
        // absurdes (des milliers de plantes en quelques minutes).
        plafondPlantesParSecondeParSymbiote: 0.5   // = 30 plantes/minute max PAR symbiote actif
    },

    // Temps d'absence "fige" au tout debut du chargement, AVANT que les routines
    // d'initialisation (reactivation des symbiotes, etc.) ne declenchent des sauvegardes
    // qui ecraseraient le timestamp precedent dans le localStorage.
    _absenceCaptureSec: null,

    /**
     * A appeler EN TOUT PREMIER dans initGame(), avant meme chargerProgression().
     * Lit et memorise le temps d'absence AVANT que quoi que ce soit d'autre ne
     * puisse declencher un sauvegarderProgression() (qui ecraserait le timestamp).
     */
    capturerAbsence: function() {
        this._absenceCaptureSec = this.getTempsAbsenceSecondes();
    },

    /**
     * Sauvegarde l'heure actuelle. A appeler a CHAQUE sauvegarde de progression
     * ainsi qu'a la fermeture/mise en arriere-plan de la page.
     */
    enregistrerTimestamp: function() {
        try {
            localStorage.setItem(this.config.storageKey, Date.now().toString());
        } catch (e) {
            console.error("Erreur lors de l'enregistrement du timestamp hors-ligne:", e);
        }
    },

    /**
     * Calcule le temps ecoule (en secondes) depuis la derniere sauvegarde du timestamp.
     * Retourne 0 si aucun timestamp n'est trouve (premiere partie).
     */
    getTempsAbsenceSecondes: function() {
        try {
            const last = localStorage.getItem(this.config.storageKey);
            if (!last) return 0;
            const elapsedMs = Date.now() - parseInt(last, 10);
            return Math.max(0, Math.floor(elapsedMs / 1000));
        } catch (e) {
            return 0;
        }
    },

    /**
     * Calcule les degats par seconde (DPS) moyens de TOUS les symbiotes actifs,
     * en se basant sur les stats en direct (getStats()) - meme logique que Symbiotes.js.
     */
    getDpsSymbiotesActifs: function() {
        const manager = window.symbiotesManager;
        if (!manager || !Array.isArray(manager.actifs) || manager.actifs.length === 0) return 0;

        const stats = manager.getStats();
        // Degats moyens par coup, en tenant compte de la chance de critique (esperance mathematique)
        // NOTE : pas de facteur d'AOE ici (retire) - on reste volontairement sur une estimation
        // "single-target" sobre. La generosite ou non du systeme se regle uniquement via
        // config.efficaciteHorsLigne et config.plafondPlantesParSecondeParSymbiote ci-dessus.
        const degatsMoyens = stats.damage * (1 + stats.critChance * (stats.critDamage - 1));
        const coupsParSeconde = 1000 / Math.max(50, stats.attackSpeed);

        const dpsParSymbiote = degatsMoyens * coupsParSeconde;
        return dpsParSymbiote * manager.actifs.length;
    },

    /**
     * Retourne le plafond de plantes/seconde applicable, en fonction du nombre de
     * symbiotes ACTIFS au moment du chargement. Plus il y a de symbiotes, plus le
     * plafond global monte (proportionnellement), tout en restant toujours borne -
     * contrairement au DPS brut qui peut s'envoler avec les upgrades/mutations/talents.
     */
    getPlafondPlantesParSeconde: function() {
        const manager = window.symbiotesManager;
        const nbSymbiotesActifs = (manager && Array.isArray(manager.actifs)) ? manager.actifs.length : 0;
        return this.config.plafondPlantesParSecondeParSymbiote * nbSymbiotesActifs;
    },

    /**
     * Determine les PV moyens et l'XP moyenne des plantes accessibles sur la route actuelle
     */
    getStatsPlantesRoute: function() {
        const db = window.PLANT_DB;
        const routeConfig = window.ROUTE_CONFIG;
        if (!db || !routeConfig) return null;

        const currentRouteId = (window.gameState && window.gameState.currentRoute) || 1;
        const config = routeConfig.find(r => r.routeId === currentRouteId);
        if (!config || !config.allowedPlantNames.length) return null;

        const plantes = config.allowedPlantNames
            .map(name => db.find(p => p.name === name))
            .filter(Boolean);

        if (plantes.length === 0) return null;

        const pvMoyen = plantes.reduce((sum, p) => sum + p.maxHp, 0) / plantes.length;
        const xpMoyenne = plantes.reduce((sum, p) => sum + p.xpValue, 0) / plantes.length;

        return { plantes, pvMoyen, xpMoyenne };
    },

    /**
     * Coeur du systeme : calcule les gains hors-ligne et les applique au gameState.
     * A appeler dans app.js -> initGame(), APRES le chargement de la sauvegarde,
     * la reactivation des symbiotes ET l'application de tous les bonus permanents
     * (sinon les stats des symbiotes utilisees seraient fausses).
     *
     * IMPORTANT : utilise le temps d'absence FIGE par capturerAbsence() (appelee en
     * tout premier dans initGame), et NON une nouvelle lecture du localStorage a ce
     * stade - sinon les sauvegardes intermediaires declenchees par la reactivation
     * des symbiotes auraient deja ecrase le timestamp avec l'heure actuelle.
     */
    calculerEtAppliquerProgression: function() {
        if (!window.gameState) return;

        const tempsAbsenceSec = (this._absenceCaptureSec !== null)
            ? this._absenceCaptureSec
            : this.getTempsAbsenceSecondes();
        this._absenceCaptureSec = null; // Consomme la valeur figee

        // Rien a faire si absence trop courte ou premiere partie
        if (tempsAbsenceSec < this.config.minOfflineSeconds) return;

        const tempsEffectifSec = Math.min(tempsAbsenceSec, this.config.maxOfflineSeconds);

        const dps = this.getDpsSymbiotesActifs();
        const statsRoute = this.getStatsPlantesRoute();

        let nbPlantesTuees = 0;
        let gainsParPlante = {};
        let xpTotale = 0;

        if (dps > 0 && statsRoute) {
            // Rendement hors-ligne applique AVANT le calcul (jamais 100% du DPS actif)
            const dpsEffectif = dps * this.config.efficaciteHorsLigne;
            const degatsTotal = dpsEffectif * tempsEffectifSec;
            const nbPlantesTueesBrut = Math.floor(degatsTotal / statsRoute.pvMoyen);

            // GARDE-FOU : plafond dynamique (par symbiote actif), garantit un resultat
            // toujours coherent quel que soit le DPS, tout en scalant avec le nombre de symbiotes
            const plafondParSeconde = this.getPlafondPlantesParSeconde();
            const plafondPlantes = Math.floor(plafondParSeconde * tempsEffectifSec);
            nbPlantesTuees = Math.min(nbPlantesTueesBrut, plafondPlantes);

            if (nbPlantesTuees > 0) {
                // 1. Plantes recoltees (reparties equitablement entre les plantes autorisees sur la route)
                const multiplicateurPlantes = window.boutiqueManager ? window.boutiqueManager.getPlantMultiplier() : 1;

                statsRoute.plantes.forEach(plante => {
                    const part = Math.floor(nbPlantesTuees / statsRoute.plantes.length) * multiplicateurPlantes;
                    if (part > 0) {
                        if (!window.gameState.inventairePlantes) window.gameState.inventairePlantes = {};
                        window.gameState.inventairePlantes[plante.name] = (window.gameState.inventairePlantes[plante.name] || 0) + part;
                        gainsParPlante[plante.name] = part;
                    }
                });

                // 2. XP (passe par ajouterExperience pour beneficier des bonus d'Evolution/Mutation)
                xpTotale = Math.floor(nbPlantesTuees * statsRoute.xpMoyenne);
                if (xpTotale > 0 && window.ajouterExperience) {
                    window.ajouterExperience(xpTotale);
                }

                // 3. Alimente aussi la jauge des Capsules - on ne credite QUE les degats
                // correspondant aux plantes reellement comptees (donc apres plafond), pour
                // rester coherent et ne pas recompenser des degats "fantomes" au-dela du cap.
                const degatsCredites = nbPlantesTuees * statsRoute.pvMoyen;
                if (window.capsulesManager) {
                    window.capsulesManager.ajouterDegatsJauge(Math.floor(degatsCredites));
                }
            }
        }

        // Rafraichissement UI + sauvegarde (ceci ecrase a nouveau le timestamp avec "maintenant",
        // ce qui est correct puisqu'on a deja consomme l'ancienne valeur au debut de la fonction)
        if (window.updateHeaderUI) window.updateHeaderUI();
        if (window.updateInventoryUI) window.updateInventoryUI();
        if (window.sauvegarderProgression) window.sauvegarderProgression();

        // Popup recapitulatif systematique des qu'il y a eu une absence significative,
        // meme si les gains sont nuls (ex : aucun symbiote actif pendant l'absence)
        this.afficherRecapOffline({
            tempsAbsenceSec: tempsAbsenceSec,
            tempsEffectifSec: tempsEffectifSec,
            nbPlantesTuees: nbPlantesTuees,
            gainsParPlante: gainsParPlante,
            xpTotale: xpTotale,
            aucunGain: nbPlantesTuees <= 0
        });
    },

    // --- INTERFACE : MODALE RECAPITULATIVE ---

    formatDuree: function(sec) {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = Math.floor(sec % 60);
        if (h > 0) return `${h}h ${m}min`;
        if (m > 0) return `${m} min ${s}s`;
        return `${s} sec`;
    },

    afficherRecapOffline: function(data) {
        if (document.getElementById('offline-recap-overlay')) return;

        const plafondAtteint = data.tempsAbsenceSec > data.tempsEffectifSec;

        let contenuGains;
        if (data.aucunGain) {
            contenuGains = `
                <div class="offline-gains-box">
                    <div class="offline-gain-row" style="justify-content:center; opacity:0.7; padding:6px 0;">
                        😴 Aucun symbiote actif n'a travaillé pendant votre absence.
                    </div>
                    <div class="offline-gain-row" style="justify-content:center; font-size:0.72rem; opacity:0.55;">
                        Activez un symbiote avant de quitter pour qu'il continue de récolter !
                    </div>
                </div>
            `;
        } else {
            const listePlantesHtml = Object.keys(data.gainsParPlante).map(nom => {
                const imgHtml = window.creerImgPlanteHTML ? window.creerImgPlanteHTML(nom, 'offline-plant-icon') : '';
                return `
                    <div class="offline-gain-row">
                        <span class="offline-gain-icon">${imgHtml}</span>
                        <span class="offline-gain-name">${nom}</span>
                        <span class="offline-gain-value">+${data.gainsParPlante[nom].toLocaleString()}</span>
                    </div>
                `;
            }).join('');

            contenuGains = `
                <div class="offline-gains-box">
                    <div class="offline-gain-row" style="border-bottom:1px dashed var(--dim-green); padding-bottom:8px; margin-bottom:8px;">
                        <span class="offline-gain-icon">🌿</span>
                        <span class="offline-gain-name">Plantes recoltees</span>
                        <span class="offline-gain-value">${data.nbPlantesTuees.toLocaleString()}</span>
                    </div>
                    ${listePlantesHtml}
                    <div class="offline-gain-row" style="border-top:1px dashed var(--dim-green); padding-top:8px; margin-top:8px;">
                        <span class="offline-gain-icon">📈</span>
                        <span class="offline-gain-name">XP gagnee</span>
                        <span class="offline-gain-value">+${data.xpTotale.toLocaleString()}</span>
                    </div>
                </div>
            `;
        }

        const overlay = document.createElement('div');
        overlay.id = 'offline-recap-overlay';
        overlay.className = 'menu-overlay';
        overlay.style.zIndex = '2500';

        overlay.innerHTML = `
            <div class="menu-content" style="max-width: 420px; padding: 25px; text-align: center; border-color: var(--neon-green); box-shadow: 0 0 30px var(--neon-green);">
                <h2 style="color: var(--neon-green); text-shadow: 0 0 8px var(--neon-green); margin-bottom: 10px;">🌙 Pendant votre absence...</h2>
                <p style="font-size: 0.85rem; color: var(--text-color); margin-bottom: 15px;">
                    Vous étiez parti pendant <strong>${this.formatDuree(data.tempsAbsenceSec)}</strong>
                    ${plafondAtteint ? `<br><span style="font-size:0.72rem; opacity:0.6;">(gains plafonnes a ${this.formatDuree(this.config.maxOfflineSeconds)} d'absence)</span>` : ''}
                </p>

                ${contenuGains}

                <button class="btn-mutation-trigger" style="width:auto; padding:10px 25px; margin-top:20px;" onclick="document.getElementById('offline-recap-overlay').remove()">
                    OK, merci !
                </button>
            </div>
        `;

        document.body.appendChild(overlay);
        this.injectStyles();

        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    },

    injectStyles: function() {
        if (document.getElementById('offline-recap-styles')) return;
        const style = document.createElement('style');
        style.id = 'offline-recap-styles';
        style.textContent = `
            .offline-gains-box {
                background: rgba(0,0,0,0.3);
                border: 1px solid var(--dim-green);
                border-radius: 6px;
                padding: 12px;
                text-align: left;
            }
            .offline-gain-row {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 0.82rem;
                padding: 3px 0;
            }
            .offline-gain-icon { flex-shrink: 0; width: 20px; text-align: center; }
            .offline-plant-icon { width: 18px; height: 18px; object-fit: contain; }
            .offline-gain-name { flex: 1; color: var(--text-color); }
            .offline-gain-value { color: var(--neon-green); font-weight: bold; }
        `;
        document.head.appendChild(style);
    }
};
