import { ECS } from "../ecs"

let oneComponentSpec = { position: { x: 10, y: 30 } }
let twoComponentsSpec = { position: { x: 10, y: 30 }, speed: { value: 20 } }

test('onupdate before create fires for one component', () => {
    let e = new ECS()
    let closure = 0
    e.onupdate(position => closure = position.x + position.y)
    e.create(oneComponentSpec)
    e.update()
    expect(closure).toBe(40)
})

test('onupdate before create fires for multiple components', () => {
    let e = new ECS()
    let closure = 0
    e.onupdate(([position, speed]) => closure = position.x + position.y + speed.value)
    e.create(twoComponentsSpec)
    e.update()
    expect(closure).toBe(60)
})

test('onupdate after create fires for one component', () => {
    let e = new ECS()
    let closure = 0
    e.create(oneComponentSpec)
    e.onupdate(position => closure = position.x + position.y)
    e.update()
    expect(closure).toBe(40)
})

test('onupdate after create fires for multiple components', () => {
    let e = new ECS()
    let closure = 0
    e.create(twoComponentsSpec)
    e.onupdate(([position, speed]) => closure = position.x + position.y + speed.value)
    e.update()
    expect(closure).toBe(60)
})


test('update fires multiple times', () => {
    let e = new ECS()
    let closure = 0
    e.onupdate(position => closure += position.x + position.y)
    e.create(oneComponentSpec)
    expect(closure).toBe(0)
    e.update()
    expect(closure).toBe(40)
    e.update()
    expect(closure).toBe(80)
    e.update()
    expect(closure).toBe(120)
})

test('update fires for multiple components', () => {
    let e = new ECS()
    let closure = 0
    e.onupdate(([position, speed]) => {
        position.x += speed.value
        position.y += speed.value
    })
    e.onupdate(position => closure += position.x + position.y)
    e.create(twoComponentsSpec)
    expect(closure).toBe(0)
    e.update()
    expect(closure).toBe(80)
})

test('update fires for multiple components, onupdate order matters', () => {
    let e = new ECS()
    let closure = 0
    e.onupdate(position => closure += position.x + position.y)
    e.onupdate(([position, speed]) => {
        position.x += speed.value
        position.y += speed.value
    })
    e.create(twoComponentsSpec)
    expect(closure).toBe(0)
    e.update()
    expect(closure).toBe(40)
})

test('components can write to each other', () => {
    let e = new ECS()
    e.create(twoComponentsSpec)
    e.onupdate(([position, speed]) => {
        position.x = speed.value
        position.y = speed.value
    })
    e.update()
    expect(e.getComponent(0, "position")).toMatchObject({x:20,y:20})
})