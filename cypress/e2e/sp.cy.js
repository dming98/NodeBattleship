describe('E2E singleplayer spec', () => {
    before(() => {
        // Start the server before the tests
        cy.exec('node server.js', {failOnNonZeroExit: false, timeout: 20000}).then((result) =>
            console.log(result)
        );
    });

    it('Validate full singleplayer gameplay', () => {
        cy.viewport(1000, 1500)
        // Load the waiting room
        cy.visit('http://localhost:8900/');
        // TODO: should to verify

        // Connect to singleplayer game
        cy.get('#singlePlayerBtn').should('have.text', 'Play against CPU').click();
        // TODO: should to verify

        // Place ships
        const gridPad = 36.1;
        let p1x = 75,p1y = 75
        cy.get('#carrier').click();
        cy.get('#p1div').click(p1x, p1y);

        p1x += gridPad;
        cy.get('#battleship').click();
        cy.get('#p1div').rightclick(p1x, p1y);
        cy.get('#p1div').click(p1x, p1y);

        p1x += gridPad;
        p1y += gridPad * 2;
        cy.get('#destroyer').click();
        cy.get('#p1div').click(p1x, p1y);

        p1x += gridPad * 2;
        p1y += gridPad * 2;
        cy.get('#submarine').click();
        cy.get('#p1div').rightclick(p1x, p1y);
        cy.get('#p1div').click(p1x, p1y);

        p1x += gridPad * 2;
        p1y += gridPad * 2;
        cy.get('#patrolboat').click();
        cy.get('#p1div').click(p1x, p1y);

        // Shoot until game ends

        function shootWhileInProgressP1(p1x, p1y, p2x, p2y) {
            let p1turn = false;
            let inProgress = true;

            cy.get('#turn-status').then((turnStatus) => {
                let status = turnStatus.text();
                p1turn = status === "It's your turn!";

                if (p1turn) {
                    cy.get('#p2div').click(p1x, p1y);
                }
            });
            cy.get('#turn-status').then((afterTurnStatus) => {
                inProgress = afterTurnStatus.text() === "Waiting for opponent." || afterTurnStatus.text() === "It's your turn!";

                if (afterTurnStatus.text() === "It's your turn!"){
                    if (inProgress && p1x < 400) {
                        shootWhileInProgressP1(p1x + gridPad, p1y, p2x, p2y)
                    } else if (inProgress && p1y < 398) {
                        shootWhileInProgressP1(75, p1y + gridPad, p2x, p2y)
                    }
                }
            });
        }

        shootWhileInProgressP1(75, 75, 75, 75-gridPad);
        // TODO: should to verify

        // Play again
        cy.get('.btn-leave-game').click();
        // TODO: should to verify

        // In waiting room
        // TODO: should to verify

    });
})
