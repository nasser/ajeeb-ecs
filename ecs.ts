/**
 * Entities are implemented as numbers (32 bit integers specifically), but
 * should be treated as opaque identifiers.
 */
export type Entity = number

class ComponentStore {
  name: string // for debugging
  entities: Array<Entity>;
  indices: Array<number>;
  components: Array<any>;
  size: number;
  oncreate?: (Entity, any) => void
  ondestroy?: (Entity, any) => void

  constructor(name: string) {
    this.entities = []
    this.indices = []
    this.components = []
    this.size = 0;
    this.name = name;
  }

  clear() {
    this.entities.length = 0
    this.indices.length = 0
    this.components.length = 0
    this.size = 0
  }

  insert(entity: Entity, component: any) {
    this.entities[this.size] = entity;
    this.components[this.size] = component;
    this.indices[entity] = this.size;
    this.size++;
    if (this.oncreate)
      this.oncreate(component, entity)
  }

  replace(entity: Entity, component: any) {
    this.components[this.indices[entity]] = component;
  }

  assign(entity: Entity, component: any) {
    if (this.contains(entity))
      this.replace(entity, component);
    else
      this.insert(entity, component);
  }

  remove(entity: Entity) {
    if (!this.contains(entity))
      return;
    if (this.ondestroy)
      this.ondestroy(this.components[this.indices[entity]], entity)
    let lastComponent = this.components[this.size - 1];
    let lastEntity = this.entities[this.size - 1];
    this.components[this.indices[entity]] = lastComponent;
    this.entities[this.indices[entity]] = lastEntity;
    this.indices[lastEntity] = this.indices[entity];
    this.size--;
  }

  get(entity: Entity) {
    return this.contains(entity) ? this.components[this.indices[entity]] : null;
  }

  getComponents() {
    return this.components.slice(0, this.size)
  }

  contains(entity: Entity) {
    return this.indices[entity] < this.size && this.entities[this.indices[entity]] == entity;
  }

  eachEntity(f: (e: Entity) => any) {
    for (var i = this.size - 1; i >= 0; i--) {
      f(this.entities[i]);
    }
  }

  eachComponent(f: (c: any) => any) {
    for (var i = this.size - 1; i >= 0; i--) {
      f(this.components[i]);
    }
  }

  each(f: (c: any, e: Entity) => any) {
    for (var i = this.size - 1; i >= 0; i--) {
      f(this.components[i], this.entities[i]);
    }
  }
}

class CachedView {
  private componentStores: ComponentStore[] = [];
  private packedComponents: ComponentStore = new ComponentStore("#packed ");

  injest(componentStore: ComponentStore) {
    let __this = this;
    let oldClear = componentStore.clear.bind(componentStore);
    componentStore.clear = function () {
      oldClear();
      __this.packedComponents.clear();
    }

    let oldRemove = componentStore.remove.bind(componentStore);
    componentStore.remove = function (entity) {
      oldRemove(entity);
      __this.packedComponents.remove(entity);
    }

    let oldInsert = componentStore.insert.bind(componentStore);
    function tryPackedInsert(entity:Entity) {
      if(__this.packedComponents.contains(entity))
        return;

      // if entity has all the components then add it to packedComponents
      for (let i = 0; i < __this.componentStores.length; i++) {
        if (!__this.componentStores[i].contains(entity)) {
          return;
        }
      }
      
      let packed = new Array(__this.componentStores.length);
      for (let i = 0; i < __this.componentStores.length; i++) {
        packed[i] = (__this.componentStores[i].get(entity))
      }
      __this.packedComponents.insert(entity, packed);
    }
    componentStore.insert = function (entity, component) {
      oldInsert(entity, component);
      tryPackedInsert(entity);
    }

    let oldReplace = componentStore.replace.bind(componentStore);
    componentStore.replace = function (entity, component) {
      oldReplace(entity, component);
      // if entity has all the components then replace it in packedComponents
      for (let i = 0; i < __this.componentStores.length; i++) {
        if (!__this.componentStores[i].contains(entity)) {
          return;
        }
      }
      let idx = __this.componentStores.indexOf(componentStore);
      let packed = __this.packedComponents.get(entity)
      packed[idx] = component;
    }

    componentStore.eachEntity(tryPackedInsert)
  }

  constructor(componentStores: ComponentStore[]) {
    this.componentStores = componentStores;
    this.packedComponents.name += this.componentStores.map(cs => cs.name).join(",")
    for (let i = 0; i < componentStores.length; i++) {
      this.injest(componentStores[i])
    }
  }

  eachEntity(f) { this.packedComponents.eachEntity(f); }
  eachComponent(f) { this.packedComponents.eachComponent(f); }
  each(f) { this.packedComponents.each(f); }
  get size() { return this.packedComponents.size }
  get entities() { return this.packedComponents.entities }
  get components() { return this.packedComponents.components }

  set oncreate(f: (Entity, any) => void) { this.packedComponents.oncreate = f }
  set ondestroy(f: (Entity, any) => void) { this.packedComponents.ondestroy = f }
}

class View {
  componentStores: Array<ComponentStore>;
  constructor(componentStores) {
    this.componentStores = componentStores;
  }
  each(f) {
    if (this.componentStores.length == 0)
      return;
    if (this.componentStores.length == 1)
      return this.componentStores[0].each(f);
    let smallestSet = this.componentStores[0];
    for (var i = this.componentStores.length - 1; i >= 0; i--)
      if (this.componentStores[i].size < smallestSet.size)
        smallestSet = this.componentStores[i];
    var componentCount = this.componentStores.length;
    var args = new Array(componentCount + 1);
    for (var i = smallestSet.size - 1; i >= 0; i--) {
      let e = smallestSet.entities[i];
      args[0] = e;
      var j = 0;
      for (; j < componentCount; j++) {
        if (!this.componentStores[j].contains(e))
          break;
        args[j + 1] = this.componentStores[j].get(e);
      }
      if (j < componentCount)
        continue;
      f.apply(null, args);
    }
  }
}

class Registry {
  entities: Array<Entity> = []
  available: number = 0
  next: number = 0

  create() {
    if (this.available > 0) {
      let entity = this.next
      this.next = this.entities[entity]
      this.entities[entity] = entity
      this.available--
      return entity
    } else {
      let entity = this.entities.length
      this.entities.push(entity)
      return entity
    }
  }

  destroy(entity: number) {
    let node = (this.available > 0 ? this.next : -1)
    this.entities[entity] = node
    this.next = entity
    this.available++
  }

  // TODO might be wrong
  valid(entity: number) {
    return entity < this.entities.length && this.entities[entity] === entity
  }

  get count(): number {
    return this.entities.length - this.available;
  }
}

export class ECS {
  private viewCache : Map<string, CachedView> = new Map()
  private updateSystems: (()=>void)[] = []
  registry: Registry = new Registry()
  components: { [_:string]: ComponentStore } = {}

  /**
   * Calls [[destroy]] on every entity
   *  
   * Component on every entity will have its [[onremove]] system fire. The order
   * they fire in is undefined.
   */
  destroyAll() {
    for (const e of this.registry.entities) {
      this.destroy(e)
    }
  }

  /**
   * Returns a [[ComponentStore]] for the component named `name`
   * 
   * If a store for a component named `name` does not already exist one is
   * created
   * 
   * @param name The name of the component
   */
  component(name: string) {
    if (this.components[name] === undefined) {
      this.components[name] = new ComponentStore(name)
    }
    return this.components[name];
  }

  /**
   * Returns the value of the component named `name` assigned to entity `e`
   * @param e The entity
   * @param name The name of the component
   */
  getComponent(e: Entity, name: string) {
    return this.component(name).get(e)
  }

  /**
   * Returns a JavaScript object of every component assigned to entity `e`
   * 
   * @remarks This is not a fast operation. The resulting object is not stored
   * or used by the ECS -- it is computed every time this method is called.
   * 
   * @param e The entity
   */
  getComponents(e: Entity) {
    let val = {}
    for (const name in this.components) {
      if (this.components.hasOwnProperty(name)) {
        const component = this.components[name];
        if (component.contains(e))
          val[name] = component.get(e)
      }
    }
    return val
  }

  /**
   * Assign the component value `cmpt` to entity `e` with the name `name` 
   * 
   * @param e The entity
   * @param name The name of the component
   * @param cmpt The value of the component
   */
  assign(e: Entity, name: string, cmpt: any) {
    return this.component(name).assign(e, cmpt)
  }

  /**
   * Remove the component named `name` from the entity `e`
   * 
   * Any destroy logic associated with `name` will be invoked.
   * 
   * @param e The entity
   * @param name The name of the component
   */
  remove(e: Entity, name: string) {
    return this.component(name).remove(e)
  }

  /**
   * Tests if the entity `e` has the a component named `name`
   * 
   * @param e The entity
   * @param name The name of the component
   */
  hasComponent(e, name) {
    return this.component(name).contains(e)
  }

  /**
   * Constructs a [[View]] of components.
   * 
   * Not sure why you would use this over the faster [[CachedView]], might be
   * obsolete.
   * 
   * @param components The stores or names of the components
   */
  private view(components: (string | ComponentStore)[]) {
    let stores = []
    for (let i = 0; i < components.length; i++) {
      if (typeof components[i] === "string")
        stores.push(this.component(components[i] as string))
      else stores.push(components[i])
    }
    return new View(stores);
  }

  /**
   * Constructs a fast view of `components`
   * 
   * Allows for rapid iteration over entites that have all every component in
   * `components`.
   * 
   * @param components The stores or names of the components
   */
  private newCachedView(components: (string | ComponentStore)[]) {
    let stores = []
    for (let i = 0; i < components.length; i++) {
      if (typeof components[i] === "string")
        stores.push(this.component(components[i] as string))
      else stores.push(components[i])
    }

    return new CachedView(stores);
  }

  // TODO figure out querying
  // /**
  //  * Get a view of every entity that has all `components`
  //  * 
  //  * @todo this could be faster
  //  * 
  //  * @param components The stores or names of the components
  //  */
  // query(components: (string | ComponentStore)[]) {
  //   return this.newCachedView(components)
  // }

  /**
   * Crimes are committed here
   * 
   * @param func Function to extract component names from
   */
  private _getComponentParamNames(func) {
    const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
    const ARGUMENT_NAMES = /([^\s,\(\)]+)/g;
    let argCount = func.length;
    if(argCount === 0) return []
    let fnStr = func.toString().replace(STRIP_COMMENTS, '').replace("function", '');
    let argStr = fnStr.slice(0, fnStr.match(/=>|\{/).index)
    let destructuring = argStr.indexOf('[') !== -1
    var result = argStr.slice(argStr.indexOf('[') + 1, argStr.indexOf(']')).match(ARGUMENT_NAMES);
    if (result === null)
    result = [];
    if(argCount === 2 && !destructuring)
      result.pop()
    return result;
  }

  private getCachedView(components) {
    let componentsString = components.toString();
    if(!this.viewCache.has(componentsString)) {
      this.viewCache.set(componentsString, this.newCachedView(components));
    }
    return this.viewCache.get(componentsString)
  }

  addAssignSystem<T=any>(components, f:(cmpts: T, e?: Entity) => void) {
    if(components.length === 0) return;
    let view = components.length === 1 ? this.component(components[0]) : this.getCachedView(components);
    view.oncreate = f
  }

  onassign<T=any>(f: (cmpts: T, e?: Entity) => void) {
    let components = this._getComponentParamNames(f)
    this.addAssignSystem(components, f)
  }

  addRemoveSystem<T=any>(components, f:(cmpts: T, e?: Entity) => void) {
    if(components.length === 0) return;
    let view = components.length === 1 ? this.component(components[0]) : this.getCachedView(components);
    view.ondestroy = f
  }

  /**
   * associate removal logic with entities
   * @sugar the names of the parameters will be used
   * @param f The function
   * @param f.cmpts a
   * @param f.e b
   */
  onremove<T=any>(f: (cmpts: T, e?: Entity) => void) {
    let components = this._getComponentParamNames(f)
    this.addRemoveSystem(components, f)
  }

  addUpdateSystem<T=any>(components, f:(cmpts: T, e?: Entity) => void) {
    if(components.length === 0) return;
    let view = components.length === 1 ? this.component(components[0]) : this.getCachedView(components);
    this.updateSystems.push(() => view.each(f) )
  }

  /**
   * Associate update systems with components matching the arguments to `system`
   * 
   * This function will run once every time [[update]] is called on every active
   * entity that has components with names matching the argument names to
   * `system`. Update systems are run in the order they are attached. The order
   * of entities within a particular system is undefined.
   * 
   * @param system The update system
   */
  onupdate<T=any>(system: (cmpts: T, e?: Entity) => void) {
    let components = this._getComponentParamNames(system)
    this.addUpdateSystem(components, system)
  }
  
  /**
   * Create a new entity and assign it components according to `spec`
   * 
   * Any [[onassign]] functions associated with components in `spec` will fire.
   * The order they fire in is undefined.
   * 
   * @param spec an object describing the components to assign to the new entity
   * 
   * @returns The newly created [[Entity]]
   */
  create(spec) {
    let newEntity = this.registry.create()
    for (const prop in spec) {
      let store = this.component(prop)
      store.assign(newEntity, {...spec[prop]})
    }
    return newEntity;
  }

  /**
   * Remove all components assigned to `entity` and remove it from [[registry]]
   * 
   * Any [[onremove]] functions associated with components on `entity` will
   * fire. The order they fire in is undefined.
   * 
   * @param entity Entity to destroy
   */
  destroy(entity:Entity) {
    for (const name in this.components) {
      this.components[name].remove(entity);
    }
    this.registry.destroy(entity);
  }

  /**
   * Run all update systems
   */
  update() {
    let length = this.updateSystems.length;
    for (let i = 0; i < length; i++) {
      this.updateSystems[i]()
    }
  }
}

export default new ECS()