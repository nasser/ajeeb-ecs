# Ajeeb ECS

[EnTT][entt] inspired [Entity Component System][wikiecs] for the browser and nodejs.

Ajeeb ECS is a TypeScript implementation of a high performance Entity Component System. It was designed for the [Ajeeb Game Engine][ajeeb] but has no dependencies and can be used anywhere.

## Installation

```
npm install nasser/ajeeb-ecs
```

## Usage

```js
import { ECS } from "ajeeb-ecs"

let ecs = new ECS()

/*** set up systems ***/

// entities with a life component lose 1 life point every frame
ecs.onupdate(life => life.remaining -= 1)

// remove entities with a life component when life is zero
ecs.onupdate(([life, self]) => {
    if(life.remaining <= 0)
        ecs.destroy(self)
})

// apply gravity to entities with position
ecs.onupdate(position => position.y -= 0.1)

// randomMove component makes entities move around randomly
ecs.onupdate(([position, randomMove]) => {
    position.x += Math.random() * randomMove.speed
    position.y += Math.random() * randomMove.speed
})

// moveRight component makes entities move to the right
ecs.onupdate(([position, moveRight]) => position.x += moveRight.speed)

/*** create entities and components ***/

for (let i = 0; i < 10000; i++) {
    // create entity at origin with random lifespan
    let e = ecs.create({
        position: { x:0, y:0 },
        life: { remaining:Math.random() * 100 }
    })

    // chance to add movement components
    if(Math.random() < 0.5)
        ecs.assign(e, "randomMove", { speed:1 })
    if(Math.random() < 0.5)
        ecs.assign(e, "moveRight", { speed:2 })
}


/*** update loop ***/

function loop() {
    ecs.update()
    requestAnimationFrame(loop)
}
loop() 
```

## TODO

* Entity versioning
* Querying

[ajeeb]: http://ajeeb.games
[entt]: https://github.com/skypjack/entt
[wikiecs]: https://en.wikipedia.org/wiki/Entity_component_system