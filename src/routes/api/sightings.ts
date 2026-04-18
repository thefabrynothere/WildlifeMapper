import { createFileRoute } from '@tanstack/react-router'
import { getStore } from '@netlify/blobs'

export interface Sighting {
  id: string
  lat: number
  lng: number
  animal: string
  note?: string
  timestamp: number
  category: string
}

function getAnimalCategory(animal: string): string {
  const lower = animal.toLowerCase()
  const birds = ['bird', 'eagle', 'hawk', 'owl', 'robin', 'sparrow', 'crow', 'duck', 'goose', 'heron', 'pigeon', 'finch', 'jay', 'cardinal', 'wren', 'starling', 'swallow', 'woodpecker', 'pelican', 'seagull', 'gull', 'parrot', 'flamingo', 'hummingbird', 'warbler', 'bluejay', 'mockingbird']
  const mammals = ['fox', 'deer', 'rabbit', 'squirrel', 'raccoon', 'coyote', 'skunk', 'opossum', 'bat', 'mole', 'rat', 'mouse', 'cat', 'dog', 'beaver', 'muskrat', 'groundhog', 'chipmunk', 'otter', 'mink', 'weasel', 'vole', 'shrew']
  const reptiles = ['snake', 'lizard', 'turtle', 'gecko', 'iguana', 'skink', 'monitor', 'garter', 'boa', 'python', 'anole', 'chameleon']
  const amphibians = ['frog', 'toad', 'salamander', 'newt', 'treefrog', 'bullfrog', 'mudpuppy']
  const insects = ['butterfly', 'moth', 'bee', 'dragonfly', 'firefly', 'beetle', 'ant', 'grasshopper', 'cricket', 'mantis', 'cicada', 'wasp', 'hornet', 'caterpillar', 'ladybug', 'damselfly']
  if (birds.some(b => lower.includes(b))) return 'bird'
  if (mammals.some(m => lower.includes(m))) return 'mammal'
  if (reptiles.some(r => lower.includes(r))) return 'reptile'
  if (amphibians.some(a => lower.includes(a))) return 'amphibian'
  if (insects.some(i => lower.includes(i))) return 'insect'
  return 'other'
}

export const Route = createFileRoute('/api/sightings')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const store = getStore({ name: 'wildlife-sightings', consistency: 'strong' })
          const { blobs } = await store.list({ prefix: 'sighting:' })

          const sightings: Sighting[] = []
          await Promise.all(
            blobs.map(async (blob) => {
              const data = await store.get(blob.key, { type: 'json' }) as Sighting | null
              if (data) sightings.push(data)
            })
          )

          sightings.sort((a, b) => b.timestamp - a.timestamp)

          return Response.json(sightings)
        } catch (err) {
          console.error('GET /api/sightings error:', err)
          return Response.json({ error: 'Failed to fetch sightings' }, { status: 500 })
        }
      },

      POST: async ({ request }) => {
        try {
          const body = await request.json() as { lat: number; lng: number; animal: string; note?: string }

          if (!body.animal?.trim() || typeof body.lat !== 'number' || typeof body.lng !== 'number') {
            return Response.json({ error: 'Missing required fields: lat, lng, animal' }, { status: 400 })
          }

          const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
          const sighting: Sighting = {
            id,
            lat: body.lat,
            lng: body.lng,
            animal: body.animal.trim().slice(0, 100),
            note: body.note?.trim().slice(0, 300) || undefined,
            timestamp: Date.now(),
            category: getAnimalCategory(body.animal),
          }

          const store = getStore({ name: 'wildlife-sightings', consistency: 'strong' })
          await store.setJSON(`sighting:${id}`, sighting)

          return Response.json(sighting, { status: 201 })
        } catch (err) {
          console.error('POST /api/sightings error:', err)
          return Response.json({ error: 'Failed to create sighting' }, { status: 500 })
        }
      },
    },
  },
})
