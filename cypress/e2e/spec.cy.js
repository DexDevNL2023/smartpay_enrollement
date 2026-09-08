describe('template spec', () => {
  it('passes', () => {
    cy.visit('https://africx-admin-test.afric.group/auth/login')
    cy.get('[name="username"]').click();
    cy.get('[name="username"]').type('sibpro61+13@gmail.com');
    cy.get('#input-2').click();
    cy.get('#input-2').type('12092');
    cy.get('#checkbox-4').check();
    cy.get('#app button.v-btn').click();
    cy.get('#app a.bg-primary span.v-btn__content').click();
    cy.get('#v-list-group--id-Symbol\\(68\\) div.mr-auto').click();
    cy.get('#app a[href="/users"] div.v-list-item-title').click();
  })
})