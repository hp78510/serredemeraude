/* L_Arbre_d_évolution.js - Arbre de Talents (Éclats d'Émeraude) */

window.evolutionManager = {

    // --- DEFINITION DES VOIES ET TALENTS ---
    voies: {
        predator: {
            name: "Voie du Prédateur",
            icon: "⚔️",
            couleur: "#ff5757",
            talents: [
                { id: "pred1", name: "Lame Dentelée",     icon: "⚔️", cout: 2,  type: "secateur_damage_mult", valeur: 0.08, desc: "+8% dégâts du Sécateur (permanent)" },
                { id: "pred2", name: "Réflexes de Mante",  icon: "🦂", cout: 3,  type: "secateur_attack_speed", valeur: 20,   desc: "-20ms de délai d'attaque" },
                { id: "pred3", name: "Instinct de Chasse", icon: "🎯", cout: 4,  type: "secateur_crit_chance",  valeur: 0.05, desc: "+5% chance de critique" },
                { id: "pred4", name: "Coup Fatal",         icon: "💥", cout: 5,  type: "secateur_crit_damage",  valeur: 0.3,  desc: "+0.3x multiplicateur de critique" },
                { id: "pred5", name: "Onde de Choc",       icon: "⭕", cout: 6,  type: "secateur_radius",       valeur: 8,    desc: "+8px de rayon d'impact" },
                { id: "pred6", name: "Apex Prédateur",     icon: "👑", cout: 10, type: "secateur_damage_mult", valeur: 0.15, desc: "+15% dégâts supplémentaires (Capstone)" }
            ]
        },
        symbiote: {
            name: "Voie du Symbiote",
            icon: "🍄",
            couleur: "#57ff8f",
            talents: [
                { id: "symb1", name: "Lien Neural",        icon: "🧠", cout: 2,  type: "symbiote_aoe",   valeur: 5,   desc: "+5px de rayon d'action des symbiotes" },
                { id: "symb2", name: "Membres Véloces",    icon: "🐆", cout: 3,  type: "symbiote_speed", valeur: 0.5, desc: "+0.5 vitesse de déplacement des symbiotes" },
                { id: "symb3", name: "Appel de la Forêt",  icon: "📯", cout: 5,  type: "symbiote_slot",  valeur: 1,   desc: "+1 emplacement de symbiote actif" },
                { id: "symb4", name: "Spores Élargies",    icon: "🍃", cout: 4,  type: "symbiote_aoe",   valeur: 10,  desc: "+10px de rayon d'action supplémentaire" },
                { id: "symb5", name: "Symbiose Parfaite",  icon: "♻️", cout: 6,  type: "symbiote_speed", valeur: 1,   desc: "+1 vitesse de déplacement supplémentaire" },
                { id: "symb6", name: "Ruche Vivante",      icon: "🐝", cout: 12, type: "symbiote_slot",  valeur: 1,   desc: "+1 emplacement de symbiote actif (Capstone)" }
            ]
        },
        alchemist: {
            name: "Voie de l'Alchimiste",
            icon: "🧪",
            couleur: "#57d2ff",
            talents: [
                { id: "alch1", name: "Transmutation de Sève", icon: "💰", cout: 2,  type: "sale_value",       valeur: 0.10, desc: "+10% golds à la vente des plantes" },
                { id: "alch2", name: "Marchand de Pétales",   icon: "💸", cout: 3,  type: "upgrade_discount", valeur: 0.10, desc: "-10% coût des upgrades de Dégâts" },
                { id: "alch3", name: "Distillation Avancée",  icon: "🧪", cout: 4,  type: "sap_bonus",        valeur: 0.10, desc: "+10% sève obtenue à l'extraction" },
                { id: "alch4", name: "Chance Alchimique",     icon: "🍀", cout: 5,  type: "free_extract",     valeur: 0.05, desc: "+5% chance de garder la plante après extraction" },
                { id: "alch5", name: "Catalyseur d'XP",       icon: "📈", cout: 4,  type: "xp_bonus",         valeur: 0.10, desc: "+10% d'XP gagnée" },
                { id: "alch6", name: "Grand Œuvre",           icon: "✨", cout: 10, type: "sale_value",       valeur: 0.20, desc: "+20% golds supplémentaires à la vente (Capstone)" }
            ]
        }
    },

    // Types appliqués DIRECTEMENT sur le sécateur/symbiotes (doivent être réappliqués à chaque chargement)
    directTypes: ["secateur_damage_mult", "secateur_attack_speed", "secateur_crit_chance", "secateur_crit_damage", "secateur_radius", "symbiote_aoe", "symbiote_speed", "symbiote_slot"],

    // --- ETAT / SAUVEGARDE ---

    ensureDefaults: function() {
        if (!window.gameState) return;
        if (!Array.isArray(window.gameState.evolutionTalents)) window.gameState.evolutionTalents = [];
        if (typeof window.gameState.eclatsEmeraude !== 'number') window.gameState.eclatsEmeraude = 0;
    },

    findTalent: function(id) {
        for (let voieId in this.voies) {
            const talent = this.voies[voieId].talents.find(t => t.id === id);
            if (talent) return { talent, voieId };
        }
        return null;
    },

    estAchete: function(id) {
        this.ensureDefaults();
        return window.gameState.evolutionTalents.includes(id);
    },

    /**
     * Un talent est deblocable si le precedent de SA voie est achete (ou s'il est le premier)
     */
    estDeblocable: function(id) {
        const found = this.findTalent(id);
        if (!found) return false;
        const { talent, voieId } = found;
        const talents = this.voies[voieId].talents;
        const index = talents.findIndex(t => t.id === id);
        if (index === 0) return true;
        return this.estAchete(talents[index - 1].id);
    },

    peutAcheter: function(id) {
        this.ensureDefaults();
        if (this.estAchete(id)) return false;
        if (!this.estDeblocable(id)) return false;
        const found = this.findTalent(id);
        if (!found) return false;
        return (window.gameState.eclatsEmeraude || 0) >= found.talent.cout;
    },

    acheterTalent: function(id) {
        if (!this.peutAcheter(id)) return false;
        const found = this.findTalent(id);
        if (!found) return false;
        const { talent } = found;

        window.gameState.eclatsEmeraude -= talent.cout;
        window.gameState.evolutionTalents.push(id);

        this.appliquerEffet(talent);

        if (window.sauvegarderProgression) window.sauvegarderProgression();
        if (window.updateHeaderUI) window.updateHeaderUI();
        this.refreshUI();
        return true;
    },

    // --- APPLICATION DES EFFETS ---

    appliquerEffet: function(talent) {
        const s = window.sécateur || window.secateur;
        switch (talent.type) {
            case 'secateur_damage_mult':
                if (s) s.damage = s.damage * (1 + talent.valeur);
                break;
            case 'secateur_attack_speed':
                if (s) s.attackSpeed = Math.max(50, s.attackSpeed - talent.valeur);
                break;
            case 'secateur_crit_chance':
                if (s) s.critChance += talent.valeur;
                break;
            case 'secateur_crit_damage':
                if (s) s.critDamage += talent.valeur;
                break;
            case 'secateur_radius':
                if (s) s.radius += talent.valeur;
                break;
            case 'symbiote_aoe':
                if (window.symbiotesManager) window.symbiotesManager.aoeBonus = (window.symbiotesManager.aoeBonus || 0) + talent.valeur;
                break;
            case 'symbiote_speed':
                if (window.symbiotesManager) window.symbiotesManager.speedBonus = (window.symbiotesManager.speedBonus || 0) + talent.valeur;
                break;
            case 'symbiote_slot':
                if (window.symbiotesManager) window.symbiotesManager.maxActifs = (window.symbiotesManager.maxActifs || 2) + talent.valeur;
                break;
            default:
                break; // sale_value, upgrade_discount, sap_bonus, free_extract, xp_bonus -> lus dynamiquement via getBonus()
        }
    },

    /**
     * Reapplique tous les effets "directs" des talents deja achetes.
     * A appeler : au chargement (app.js -> initGame, APRES boutiqueManager.reappliquer())
     * ET apres une Mutation Genetique (le secateur est reset a sa base).
     */
    reappliquerEffetsDirects: function() {
        this.ensureDefaults();
        window.gameState.evolutionTalents.forEach(id => {
            const found = this.findTalent(id);
            if (found && this.directTypes.includes(found.talent.type)) {
                this.appliquerEffet(found.talent);
            }
        });
    },

    /**
     * Bonus cumule (en %) des talents "economiques" d'un type donne, pour lecture
     * dynamique par les autres modules (Vente.js, upgrades.js, Extraction.js, experience.js)
     */
    getBonus: function(type) {
        this.ensureDefaults();
        let total = 0;
        window.gameState.evolutionTalents.forEach(id => {
            const found = this.findTalent(id);
            if (found && found.talent.type === type) total += found.talent.valeur;
        });
        return total;
    },

    /**
     * Fonction utilitaire globale : additionne un bonus de Mutation Genetique
     * (mutationTypeId) avec un bonus d'Evolution (evolutionTypeId). Utilisee par
     * Vente.js, upgrades.js, Extraction.js et experience.js pour ne pas dupliquer
     * la logique de cumul partout.
     */
    getBonusCombine: function(mutationTypeId, evolutionTypeId) {
        let total = 0;
        if (mutationTypeId && window.mutationManager && window.mutationManager.getBonusValue) {
            total += window.mutationManager.getBonusValue(mutationTypeId);
        }
        if (evolutionTypeId) {
            total += this.getBonus(evolutionTypeId);
        }
        return total;
    },

    // --- INTERFACE ---

    _activeVoie: 'predator',

    ouvrirArbre: function() {
        this.ensureDefaults();
        if (document.getElementById('evolution-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'evolution-overlay';
        overlay.className = 'menu-overlay';
        overlay.onclick = (e) => { if (e.target === overlay) this.fermerArbre(); };

        overlay.innerHTML = `
            <div class="menu-content" style="border-color:#57ff8f; box-shadow:0 0 30px #57ff8f;">
                <div class="menu-header">
                    <h2 style="color:#57ff8f; text-shadow:0 0 8px #57ff8f;">🌳 L'Arbre d'Évolution</h2>
                    <button class="btn-close-menu" onclick="window.evolutionManager.fermerArbre()">✖</button>
                </div>

                <div class="evo-solde">
                    <span>💚 Éclats d'Émeraude :</span>
                    <span id="evo-solde-value">${(window.gameState.eclatsEmeraude || 0).toLocaleString()}</span>
                </div>

                <div class="menu-tabs evo-tabs">
                    <button class="tab-btn active" data-voie="predator">⚔️ Prédateur</button>
                    <button class="tab-btn" data-voie="symbiote">🍄 Symbiote</button>
                    <button class="tab-btn" data-voie="alchemist">🧪 Alchimiste</button>
                </div>

                <div class="menu-body">
                    <div id="evo-tree-container"></div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                overlay.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this._activeVoie = btn.getAttribute('data-voie');
                this.renderTree();
            });
        });

        this.injectStyles();
        this.renderTree();
    },

    fermerArbre: function() {
        const overlay = document.getElementById('evolution-overlay');
        if (overlay) overlay.remove();
    },

    refreshUI: function() {
        if (!document.getElementById('evolution-overlay')) return;
        const soldeEl = document.getElementById('evo-solde-value');
        if (soldeEl) soldeEl.textContent = (window.gameState.eclatsEmeraude || 0).toLocaleString();
        this.renderTree();
    },

    renderTree: function() {
        const container = document.getElementById('evo-tree-container');
        if (!container) return;

        const voie = this.voies[this._activeVoie];
        container.innerHTML = `<p class="evo-voie-desc">${voie.name}</p>`;

        const path = document.createElement('div');
        path.className = 'evo-path';
        path.style.setProperty('--voie-color', voie.couleur);

        voie.talents.forEach((talent, index) => {
            const achete = this.estAchete(talent.id);
            const deblocable = this.estDeblocable(talent.id);
            const canBuy = this.peutAcheter(talent.id);
            const verrouille = !achete && !deblocable;

            const node = document.createElement('div');
            node.className = `evo-node ${achete ? 'evo-acquis' : ''} ${verrouille ? 'evo-verrouille' : ''}`;

            node.innerHTML = `
                <div class="evo-node-icon">${verrouille ? '🔒' : talent.icon}</div>
                <div class="evo-node-info">
                    <div class="evo-node-name">${talent.name}</div>
                    <div class="evo-node-desc">${talent.desc}</div>
                    <button class="btn-evo ${achete ? 'achete' : ''}" ${(achete || !canBuy) ? 'disabled' : ''}
                            onclick="window.evolutionManager.acheterTalent('${talent.id}')">
                        ${achete ? '✔ ACQUIS' : `💚 ${talent.cout}`}
                    </button>
                </div>
            `;
            path.appendChild(node);

            if (index < voie.talents.length - 1) {
                const connector = document.createElement('div');
                connector.className = `evo-connector ${achete ? 'evo-connector-active' : ''}`;
                path.appendChild(connector);
            }
        });

        container.appendChild(path);
    },

    injectStyles: function() {
        if (document.getElementById('evolution-styles')) return;
        const style = document.createElement('style');
        style.id = 'evolution-styles';
        style.textContent = `
            .evo-solde {
                display: flex;
                justify-content: center;
                gap: 8px;
                padding: 10px;
                background: rgba(87, 255, 143, 0.08);
                border-bottom: 1px solid var(--dim-green);
                font-weight: bold;
                color: #57ff8f;
            }
            .evo-tabs .tab-btn { font-size: 0.8rem; padding: 12px 4px; }

            .evo-voie-desc {
                text-align: center;
                color: #fff;
                font-size: 0.9rem;
                margin-bottom: 15px;
                text-transform: uppercase;
                letter-spacing: 1px;
                opacity: 0.8;
            }

            .evo-path {
                display: flex;
                flex-direction: column;
                align-items: center;
            }

            .evo-node {
                display: flex;
                align-items: center;
                gap: 12px;
                width: 100%;
                max-width: 420px;
                background: rgba(0,0,0,0.3);
                border: 1px solid var(--voie-color, #57ff8f);
                border-radius: 8px;
                padding: 10px;
                transition: 0.2s;
            }
            .evo-node.evo-acquis {
                background: rgba(87, 255, 143, 0.1);
                box-shadow: 0 0 10px var(--voie-color, #57ff8f);
            }
            .evo-node.evo-verrouille {
                opacity: 0.45;
                filter: grayscale(0.6);
                border-color: #444;
            }

            .evo-node-icon {
                font-size: 1.8rem;
                flex-shrink: 0;
                width: 45px;
                height: 45px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(0,0,0,0.4);
                border-radius: 50%;
                border: 1px solid var(--voie-color, #57ff8f);
            }

            .evo-node-info { flex: 1; display: flex; flex-direction: column; gap: 4px; }
            .evo-node-name { font-weight: bold; color: #fff; font-size: 0.9rem; }
            .evo-node-desc { font-size: 0.72rem; color: #ccc; }

            .btn-evo {
                align-self: flex-start;
                background: rgba(0,0,0,0.4);
                border: 1px solid var(--voie-color, #57ff8f);
                color: #fff;
                padding: 5px 12px;
                border-radius: 4px;
                font-weight: bold;
                font-size: 0.75rem;
                cursor: pointer;
                margin-top: 3px;
                transition: 0.2s;
            }
            .btn-evo:hover:not(:disabled) { background: var(--voie-color, #57ff8f); color: #000; }
            .btn-evo:disabled { opacity: 0.4; cursor: not-allowed; }
            .btn-evo.achete { background: var(--voie-color, #57ff8f); color: #000; cursor: default; }

            .evo-connector {
                width: 3px;
                height: 22px;
                background: #333;
            }
            .evo-connector-active { background: var(--voie-color, #57ff8f); }
        `;
        document.head.appendChild(style);
    }
};

// Raccourci global
window.ouvrirArbreEvolution = function() {
    window.evolutionManager.ouvrirArbre();
};
