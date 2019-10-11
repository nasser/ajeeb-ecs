import { ECS } from "../ecs"

test('constructor works', () => {
    expect(new ECS()).toBeDefined()
});

test('create increases registry size', () => {
    let e = new ECS()
    for (let index = 0; index < 20; index++) {
        e.create({})
    }
    expect(e.registry.count).toBe(20)
});

test('destroy decreases registry size', () => {
    let e = new ECS()
    let es = []
    for (let index = 0; index < 20; index++) {
        es.push(e.create({}))
    }
    for (const entity of es) {
        e.destroy(entity)
    }
    expect(e.registry.count).toBe(0)
});

test('destroyAll zeros registry size', () => {
    let e = new ECS()
    for (let index = 0; index < 20; index++) {
        e.create({})
    }
    e.destroyAll()
    expect(e.registry.count).toBe(0)
});

test('created entities are valid', () => {
    let e = new ECS()
    for (let index = 0; index < 20; index++) {
        e.create({})
    }
    expect(e.registry.valid(0)).toBe(true)
    expect(e.registry.valid(10)).toBe(true)
    expect(e.registry.valid(19)).toBe(true)
    expect(e.registry.valid(20)).toBe(false)
    expect(e.registry.valid(50)).toBe(false)
});

test('no entities are valid after destroyAll', () => {
    let e = new ECS()
    for (let index = 0; index < 20; index++) {
        e.create({})
    }
    e.destroyAll()
    expect(e.registry.valid(0)).toBe(false)
    expect(e.registry.valid(10)).toBe(false)
    expect(e.registry.valid(19)).toBe(false)
    expect(e.registry.valid(20)).toBe(false)
    expect(e.registry.valid(50)).toBe(false)
});

test('destroyed entities are not valid', () => {
    let e = new ECS()
    for (let index = 0; index < 20; index++) {
        e.create({})
    }
    e.destroy(0)
    e.destroy(3)
    expect(e.registry.valid(0)).toBe(false)
    expect(e.registry.valid(3)).toBe(false)
    expect(e.registry.valid(1)).toBe(true)
    expect(e.registry.valid(2)).toBe(true)
    expect(e.registry.valid(4)).toBe(true)
    expect(e.registry.valid(10)).toBe(true)
    expect(e.registry.valid(19)).toBe(true)
});

test('component stores created automatically', () => {
    let e = new ECS()
    e.create({ position: { x: 10, y: 30 } })
    expect(e.components.position).toBeDefined()
    expect(e.components.position.get(0).x).toBe(10)
    expect(e.components.position.get(0).y).toBe(30)
})

test('getComponents reflects created component', () => {
    let e = new ECS()
    let spec = { position: { x: 10, y: 30 } }
    e.create(spec)
    expect(e.getComponents(0)).toMatchObject(spec)
})

test('hasComponent reflects created component', () => {
    let e = new ECS()
    let spec = { position: { x: 10, y: 30 } }
    let ent = e.create(spec)
    expect(e.hasComponent(ent, "position")).toBe(true)
})

test('getComponents reflects created components', () => {
    let e = new ECS()
    let spec = {
        position: { x: 10, y: 30 },
        name: { value: "foo" }
    }
    e.create(spec)
    expect(e.getComponents(0)).toMatchObject(spec)
})
