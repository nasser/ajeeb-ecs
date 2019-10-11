import { ECS } from "../ecs"

let oneComponentSpec = { position: { x: 0, y: 0 } }
let twoComponentsSpec = { position: { x: 0, y: 0 }, speed: { value: 1 } }

test('remove removes components', () => {
    let e = new ECS()
    let ent = e.create(oneComponentSpec)
    expect(e.getComponent(ent, "position")).toMatchObject({x:0, y:0})
    expect(e.getComponents(ent)).toMatchObject({position:{x:0, y:0}})
    e.remove(ent, "position")
    expect(e.getComponent(ent, "position")).toBeNull()
    expect(e.getComponents(ent)).toMatchObject({})
})

test('removing more than once is ok', () => {
    let e = new ECS()
    let ent = e.create(oneComponentSpec)
    expect(e.getComponent(ent, "position")).toMatchObject({x:0, y:0})
    expect(e.getComponents(ent)).toMatchObject({position:{x:0, y:0}})
    e.remove(ent, "position")
    e.remove(ent, "position")
    expect(e.getComponent(ent, "position")).toBeNull()
    expect(e.getComponents(ent)).toMatchObject({})
})

test('removing non-existent components is ok', () => {
    let e = new ECS()
    let ent = e.create(oneComponentSpec)
    expect(e.getComponent(ent, "position")).toMatchObject({x:0, y:0})
    expect(e.getComponents(ent)).toMatchObject({position:{x:0, y:0}})
    e.remove(ent, "jormis")
    expect(e.getComponent(ent, "position")).toMatchObject({x:0, y:0})
    expect(e.getComponents(ent)).toMatchObject({position:{x:0, y:0}})
})

test('onremove fires for one component', () => {
    let e = new ECS()
    let ent = e.create(oneComponentSpec)
    let closure = 0
    e.onremove(position => closure += 1)
    e.remove(ent, "position")
    expect(closure).toBe(1)
})

test('destroy fires onremove for one component', () => {
    let e = new ECS()
    let ent = e.create(oneComponentSpec)
    let closure = 0
    e.onremove(position => closure += 1)
    e.destroy(ent)
    expect(closure).toBe(1)
})

test('destroyAll fires onremove for one component', () => {
    let e = new ECS()
    let ent = e.create(oneComponentSpec)
    let closure = 0
    e.onremove(position => closure += 1)
    e.destroyAll()
    expect(closure).toBe(1)
})

test('destroyAll fires onremove for one component, many entities', () => {
    let e = new ECS()
    e.create(oneComponentSpec)
    e.create(oneComponentSpec)
    e.create(oneComponentSpec)
    e.create(oneComponentSpec)
    let closure = 0
    e.onremove(position => closure += 1)
    e.destroyAll()
    expect(closure).toBe(4)
})


test('onremove fires only once for one component', () => {
    let e = new ECS()
    let ent = e.create(oneComponentSpec)
    let closure = 0
    e.onremove(position => closure += 1)
    e.remove(ent, "position")
    e.remove(ent, "position")
    expect(closure).toBe(1)
})

test('onremove fires for multiple components', () => {
    let e = new ECS()
    let ent = e.create(twoComponentsSpec)
    let closure = 0
    e.onremove(([position,speed]) => closure += 1)
    e.remove(ent, "position")
    expect(closure).toBe(1)
})

test('onremove fires for single components first', () => {
    let e = new ECS()
    let ent = e.create(twoComponentsSpec)
    let closure = ""
    e.onremove(position => closure += "A")
    e.onremove(([position,speed]) => closure += "B")
    e.remove(ent, "position")
    expect(closure).toBe("AB")
})

test('onremove fires for single components first, regardless of invocation order', () => {
    let e = new ECS()
    let ent = e.create(twoComponentsSpec)
    let closure = ""
    e.onremove(([position,speed]) => closure += "B")
    e.onremove(position => closure += "A")
    e.remove(ent, "position")
    expect(closure).toBe("AB")
})

test('destroy fires once for multiple components', () => {
    let e = new ECS()
    let ent = e.create(twoComponentsSpec)
    let closure = 0
    e.onremove(([position,speed]) => closure += 1)
    e.destroy(ent)
    expect(closure).toBe(1)
})

test('destroyAll fires once for multiple components', () => {
    let e = new ECS()
    let ent = e.create(twoComponentsSpec)
    let closure = 0
    e.onremove(([position,speed]) => closure += 1)
    e.destroyAll()
    expect(closure).toBe(1)
})


test('destroy fires all components', () => {
    let e = new ECS()
    let ent = e.create(twoComponentsSpec)
    let closure = 0
    e.onremove(position => closure += 1)
    e.onremove(speed => closure += 1)
    e.onremove(([position,speed]) => closure += 1)
    e.destroy(ent)
    expect(closure).toBe(3)
})

test('destroyAll fires all components', () => {
    let e = new ECS()
    let ent = e.create(twoComponentsSpec)
    let closure = 0
    e.onremove(position => closure += 1)
    e.onremove(speed => closure += 1)
    e.onremove(([position,speed]) => closure += 1)
    e.destroyAll()
    expect(closure).toBe(3)
})
