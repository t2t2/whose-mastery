export async function up(knex) {
	await knex.schema.createTable('summoners', table => {
		table.increments('id')
		table.bigInteger('riot_id')
		table.text('region')
		table.string('name')
		table.integer('icon_id')
		table.timestamps()

		table.index(['riot_id', 'region'])
	})

	await knex.schema.table('players', table => {
		table.integer('summoner_id').references('id').inTable('players').onUpdate('CASCADE').onDelete('CASCADE')
	})

	await knex.schema.table('sessions', table => {
		table.integer('summoner_id').references('id').inTable('players').onUpdate('CASCADE').onDelete('CASCADE')
	})
}

export async function down(knex) {
	await knex.schema.table('sessions', table => {
		table.dropColumn('summoner_id')
	})

	await knex.schema.table('players', table => {
		table.dropColumn('summoner_id')
	})

	await knex.schema.dropTable('summoners')
}