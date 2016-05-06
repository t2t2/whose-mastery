import _ from 'lodash'
import errors from 'feathers-errors'
import randomstring from 'randomstring'
import service from 'feathers-knex'

import knex from '../database'
import {disable, updateTimestamps, pluck, populateUser, remove, removeIndividually, restrictToAuthenticated, verifyToken} from '../hooks'

function addPlayerAsRoomOwner() {
	return async (hook) => {
		if (!hook.params.provider) {
			return
		}

		const createPlayerParams = _.assign({}, hook.params, {
			query: {
				// join_code is removed in .get, .create is internally calling .get so it get's sniped away
				join_code: hook.data.join_code
			}
		})

		// Add as player
		const player = await hook.app.service('api/players').create({}, createPlayerParams)

		// Set as owner
		await hook.app.service('api/rooms').patch(hook.result.id, {
			owner_player_id: player.id
		})
		hook.result.owner_player_id = player.id
	}
}

function generateRoomCode() {
	async function getRandomCode({app}) {
		let code
		while (true) {
			code = randomstring.generate({
				length: 8,
				readable: true,
				charset: 'alphanumeric'
			})
			// Make sure doesn't exist
			const exists = await app.service('api/rooms').find({
				query: {
					join_code: code,
					$limit: 1
				}
			})
			if (!exists.length) {
				break
			}
		}

		return code
	}

	return async (hook) => {
		const code = await getRandomCode(hook)
		hook.data.join_code = code
		return hook
	}
}

function mustNotBeInARoom() {
	return hook => {
		if (hook.params.provider && hook.params.user.player_id) {
			throw new errors.Forbidden('You are already playing in a game. Leave it first')
		}
	}
}

export default function () {
	const app = this

	app.service('api/rooms', service({
		Model: knex,
		name: 'rooms'
	}))

	const roomsService = app.service('api/rooms')

	roomsService.before({
		create: [
			verifyToken(),
			populateUser(),
			restrictToAuthenticated(),
			mustNotBeInARoom(),
			pluck(''), // Need to pluck something
			generateRoomCode(),
			updateTimestamps()
		],
		update: [disable('external'), updateTimestamps()],
		patch: [disable('external'), updateTimestamps()],
		remove: [disable('external')]
	})

	roomsService.after({
		all: [
			removeIndividually('join_code', (hook, room) => {
				return hook.method !== 'create' && !!hook.params.provider && (!hook.params.user || !hook.params.user.player_id || hook.params.user.player.room_id !== room.id)
			})
		],
		create: [
			addPlayerAsRoomOwner()
		]
	})
}