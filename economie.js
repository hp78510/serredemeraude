/* economie.js - Gestion de l'economie (Golds, Gemmes) */

// Objet global pour gerer l'economie
window.economie = {
    /**
     * Ajoute une quantite de Golds
     * @param {number} montant 
     */
    ajouterGolds: function(montant) {
        if (!window.gameState) {
            console.error("Erreur: window.gameState non defini.");
            return;
        }
        
        // Initialisation si la variable n'existe pas (securite)
        if (typeof window.gameState.golds === 'undefined') {
            window.gameState.golds = 0;
        }

        window.gameState.golds += montant;
        this.mettreAJourUI();
        
        // Sauvegarde immediate pour eviter la perte de donnees
        if (window.sauvegarderProgression) {
            window.sauvegarderProgression();
        }
    },

    /**
     * Ajoute une quantite de Gemmes
     * @param {number} montant 
     */
    ajouterGemmes: function(montant) {
        if (!window.gameState) {
            console.error("Erreur: window.gameState non defini.");
            return;
        }

        // Initialisation si la variable n'existe pas (securite)
        if (typeof window.gameState.gemmes === 'undefined') {
            window.gameState.gemmes = 0;
        }

        window.gameState.gemmes += montant;
        this.mettreAJourUI();
        
        // Sauvegarde immediate pour eviter la perte de donnees
        if (window.sauvegarderProgression) {
            window.sauvegarderProgression();
        }
    },

    /**
     * Depense des Golds. Retourne true si reussi, false sinon.
     * @param {number} montant 
     * @returns {boolean}
     */
    depenserGolds: function(montant) {
        if (!window.gameState) return false;
        
        if (typeof window.gameState.golds === 'undefined') {
            window.gameState.golds = 0;
        }

        if (window.gameState.golds >= montant) {
            window.gameState.golds -= montant;
            this.mettreAJourUI();
            
            if (window.sauvegarderProgression) {
                window.sauvegarderProgression();
            }
            return true;
        }
        return false;
    },

    /**
     * Depense des Gemmes. Retourne true si reussi, false sinon.
     * @param {number} montant 
     * @returns {boolean}
     */
    depenserGemmes: function(montant) {
        if (!window.gameState) return false;

        if (typeof window.gameState.gemmes === 'undefined') {
            window.gameState.gemmes = 0;
        }

        if (window.gameState.gemmes >= montant) {
            window.gameState.gemmes -= montant;
            this.mettreAJourUI();
            
            if (window.sauvegarderProgression) {
                window.sauvegarderProgression();
            }
            return true;
        }
        return false;
    },

    /**
     * Verifie si le joueur a assez de fonds pour une transaction
     * @param {number} prix 
     * @param {string} type 'gold' ou 'gemme'
     * @returns {boolean}
     */
    verifierFonds: function(prix, type) {
        if (!window.gameState) return false;

        let currentAmount = 0;
        if (type === 'gold') {
            currentAmount = window.gameState.golds || 0;
        } else if (type === 'gemme') {
            currentAmount = window.gameState.gemmes || 0;
        }

        return currentAmount >= prix;
    },

    /**
     * Met a jour l'affichage des monnaies dans le header
     * Delegue l'appel a app.js pour garder la coherence de l'interface
     */
    mettreAJourUI: function() {
        if (window.updateHeaderUI) {
            window.updateHeaderUI();
        }
    }
};
