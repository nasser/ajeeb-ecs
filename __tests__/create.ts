import { ECS } from "../ecs"

let oneComponentSpec = { position: { x: 0, y: 0 } }
let twoComponentsSpec = { position: { x: 0, y: 0 }, speed: { value: 1 } }
let twoComponentsSpecDifferent = { health: { vulnerable: true, value: 0 }, speed: { value: 1 } }

test('create clones components', () => {
    let e = new ECS()
    e.create(oneComponentSpec)
    e.onupdate(position => position.x += 10)
    e.update()
    expect(oneComponentSpec).toMatchObject({position: {x:0,y:0}})
    expect(e.getComponent(0, "position")).toMatchObject({x:10,y:0})
})

test('create after destroy', () => {
    let e = new ECS()
    let ent = e.create(oneComponentSpec)
    expect(e.getComponent(ent, "position")).toMatchObject({x:0,y:0})
    e.destroy(ent)
    expect(e.getComponent(ent, "position")).toBeNull()
    let ent2 = e.create(twoComponentsSpecDifferent)
    expect(e.getComponent(ent2, "position")).toBeNull()
    expect(e.getComponent(ent2, "health")).toMatchObject({vulnerable: true, value: 0})
})


test('onassign before create fires for one component', () => {
    let e = new ECS()
    let closure = 0
    e.onassign(position => closure += 1)
    e.create(oneComponentSpec)
    expect(closure).toBe(1)
})

test('onassign before create fires for one component on multiple entities', () => {
    let e = new ECS()
    let closure = 0
    e.onassign(position => closure += 1)
    e.create(oneComponentSpec)
    e.create(oneComponentSpec)
    e.create(oneComponentSpec)
    expect(closure).toBe(3)
})

test('onassign before create fires for multiple components', () => {
    let e = new ECS()
    let closure = 0
    e.onassign(([position,speed]) => closure += 1)
    e.create(twoComponentsSpec)
    expect(closure).toBe(1)
})

test('onassign before create fires for multiple components on multiple entities', () => {
    let e = new ECS()
    let closure = 0
    e.onassign(([position,speed]) => closure += 1)
    e.create(twoComponentsSpec)
    e.create(twoComponentsSpec)
    e.create(twoComponentsSpec)
    expect(closure).toBe(3)
})

test('onassign before create fires for multiple components only if both are present', () => {
    let e = new ECS()
    let closure = 0
    e.onassign(([position,speed]) => closure += 1)
    e.create(oneComponentSpec)
    expect(closure).toBe(0)
})

test('onassign fires once on assign for one component', () => {
    let e = new ECS()
    let closure = 0
    e.onassign(position => closure += 1)
    let ent = e.create({})
    expect(closure).toBe(0)
    // TODO nicer assign syntax
    e.assign(ent, "position", {x:0,y:0})
    expect(closure).toBe(1)
    e.assign(ent, "position", {x:0,y:0})
    expect(closure).toBe(1)
})

test('onassign fires once on assign for multiple components', () => {
    let e = new ECS()
    let closure = 0
    e.onassign(([position, speed]) => closure += 1)
    let ent = e.create({})
    expect(closure).toBe(0)
    e.assign(ent, "position", {x:0,y:0})
    expect(closure).toBe(0)
    e.assign(ent, "position", {x:0,y:0})
    expect(closure).toBe(0)
    e.assign(ent, "speed", {value:0})
    expect(closure).toBe(1)
    e.assign(ent, "speed", {value:0})
    expect(closure).toBe(1)
})

test('onassign fires once per assign for one component', () => {
    let e = new ECS()
    let closure = 0
    e.onassign(position => closure += 1)
    let ent = e.create({})
    expect(closure).toBe(0)
    e.assign(ent, "position", {x:0,y:0})
    expect(closure).toBe(1)
    e.remove(ent, "position")
    e.assign(ent, "position", {x:0,y:0})
    expect(closure).toBe(2)
})

test('onassign fires once per assign for multiple components', () => {
    let e = new ECS()
    let closure = 0
    e.onassign(([position, speed]) => closure += 1)
    let ent = e.create({})
    expect(closure).toBe(0)
    e.assign(ent, "position", {x:0,y:0})
    expect(closure).toBe(0)
    e.assign(ent, "speed", {value:0})
    expect(closure).toBe(1)
    e.remove(ent, "position")
    e.assign(ent, "position", {x:0,y:0})
    expect(closure).toBe(2)
})


test('onassign before create only fires if component is present', () => {
    let e = new ECS()
    let closure = 0
    e.onassign(position => closure += 1)
    e.create({foo:"bar"})
    expect(closure).toBe(0)
})

test('onassign can write to component', () => {
    let e = new ECS()
    e.onassign(position => position.x += 10)
    let ent = e.create(oneComponentSpec)
    expect(e.getComponent(ent, "position").x).toBe(10)
})