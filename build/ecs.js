"use strict";
// TODO creating a cached view when there are already entities in the registry should grab them
Object.defineProperty(exports, "__esModule", { value: true });
class ComponentStore {
    constructor(name) {
        this.entities = [];
        this.indices = [];
        this.components = [];
        this.size = 0;
        this.name = name;
    }
    clear() {
        this.entities.length = 0;
        this.indices.length = 0;
        this.components.length = 0;
        this.size = 0;
    }
    insert(entity, component) {
        this.entities[this.size] = entity;
        this.components[this.size] = component;
        this.indices[entity] = this.size;
        this.size++;
        if (this.oncreate)
            this.oncreate(component, entity);
    }
    replace(entity, component) {
        this.components[this.indices[entity]] = component;
    }
    assign(entity, component) {
        if (this.contains(entity))
            this.replace(entity, component);
        else
            this.insert(entity, component);
    }
    remove(entity) {
        if (!this.contains(entity))
            return;
        if (this.ondestroy)
            this.ondestroy(this.components[this.indices[entity]], entity);
        let lastComponent = this.components[this.size - 1];
        let lastEntity = this.entities[this.size - 1];
        this.components[this.indices[entity]] = lastComponent;
        this.entities[this.indices[entity]] = lastEntity;
        this.indices[lastEntity] = this.indices[entity];
        this.size--;
    }
    get(entity) {
        if (this.contains(entity))
            return this.components[this.indices[entity]];
    }
    getComponents() {
        return this.components.slice(0, this.size);
    }
    contains(entity) {
        return this.indices[entity] < this.size && this.entities[this.indices[entity]] == entity;
    }
    eachEntity(f) {
        for (var i = this.size - 1; i >= 0; i--) {
            f(this.entities[i]);
        }
    }
    eachComponent(f) {
        for (var i = this.size - 1; i >= 0; i--) {
            f(this.components[i]);
        }
    }
    each(f) {
        for (var i = this.size - 1; i >= 0; i--) {
            f(this.components[i], this.entities[i]);
        }
    }
}
class CachedView {
    constructor(componentStores) {
        this.componentStores = [];
        this.packedComponents = new ComponentStore("#packed ");
        this.componentStores = componentStores;
        this.packedComponents.name += this.componentStores.map(cs => cs.name).join(",");
        for (let i = 0; i < componentStores.length; i++) {
            this.injest(componentStores[i]);
        }
    }
    injest(componentStore) {
        let __this = this;
        let oldClear = componentStore.clear.bind(componentStore);
        componentStore.clear = function () {
            oldClear();
            __this.packedComponents.clear();
        };
        let oldRemove = componentStore.remove.bind(componentStore);
        componentStore.remove = function (entity) {
            oldRemove(entity);
            __this.packedComponents.remove(entity);
        };
        let oldInsert = componentStore.insert.bind(componentStore);
        function tryPackedInsert(entity) {
            if (__this.packedComponents.contains(entity))
                return;
            // if entity has all the components then add it to packedComponents
            for (let i = 0; i < __this.componentStores.length; i++) {
                if (!__this.componentStores[i].contains(entity)) {
                    return;
                }
            }
            let packed = new Array(__this.componentStores.length);
            for (let i = 0; i < __this.componentStores.length; i++) {
                packed[i] = (__this.componentStores[i].get(entity));
            }
            __this.packedComponents.insert(entity, packed);
        }
        componentStore.insert = function (entity, component) {
            oldInsert(entity, component);
            tryPackedInsert(entity);
        };
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
            let packed = __this.packedComponents.get(entity);
            packed[idx] = component;
        };
        componentStore.eachEntity(tryPackedInsert);
    }
    eachEntity(f) { this.packedComponents.eachEntity(f); }
    eachComponent(f) { this.packedComponents.eachComponent(f); }
    each(f) { this.packedComponents.each(f); }
    count() { return this.packedComponents.size; }
    set oncreate(f) { this.packedComponents.oncreate = f; }
    set ondestroy(f) { this.packedComponents.ondestroy = f; }
}
class View {
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
    constructor() {
        this.entities = [];
        this.available = 0;
        this.next = 0;
    }
    create() {
        if (this.available > 0) {
            let entity = this.next;
            this.next = this.entities[entity];
            this.entities[entity] = entity;
            this.available--;
            return entity;
        }
        else {
            let entity = this.entities.length;
            this.entities.push(entity);
            return entity;
        }
    }
    destroy(entity) {
        let node = (this.available > 0 ? this.next : -1);
        this.entities[entity] = node;
        this.next = entity;
        this.available++;
    }
    // TODO might be wrong
    valid(entity) {
        return entity < this.entities.length && this.entities[entity] === entity;
    }
    get count() {
        return this.entities.length - this.available;
    }
}
class ECS {
    constructor() {
        this.viewCache = new Map();
        this.registry = new Registry();
        this.components = {};
        this.updateSystems = [];
    }
    // createSystems: { [name: string]: (e: Entity, component) => any } = {}
    // destroySystems: { [name: string]: (e: Entity, component) => any } = {}
    /**
     * Destroys all entities
     */
    destroyAll() {
        let entitySet = new Set();
        for (const name in this.components) {
            let c = this.components[name];
            c.eachEntity(e => entitySet.add(e));
        }
        entitySet.forEach(e => {
            this.destroy(e);
        });
    }
    /**
     * Returns a [[ComponentStore]] for the component named `name`
     *
     * If a store for a component named `name` does not already exist one is
     * created
     *
     * @param name The name of the component
     */
    component(name) {
        if (this.components[name] === undefined) {
            this.components[name] = new ComponentStore(name);
        }
        return this.components[name];
    }
    /**
     * Returns the value of the component named `name` assigned to entity `e`
     * @param e The entity
     * @param name The name of the component
     */
    getComponent(e, name) {
        return this.component(name).get(e);
    }
    /**
     * Returns a JavaScript object of every component assigned to entity `e`
     *
     * @remarks This is not a fast operation. The object is not stored or used by
     * the ECS -- it is computed every time this method is called.
     *
     * @param e The entity
     */
    getComponents(e) {
        let val = {};
        for (const name in this.components) {
            if (this.components.hasOwnProperty(name)) {
                const component = this.components[name];
                if (component.contains(e))
                    val[name] = component.get(e);
            }
        }
        return val;
    }
    /**
     * Assign the component value `cmpt` to entity `e` with the name `name`
     *
     * @todo this should fire create logic
     *
     * @param e The entity
     * @param name The name of the component
     * @param cmpt The value of the component
     */
    assign(e, name, cmpt) {
        return this.component(name).assign(e, cmpt);
    }
    /**
     * Remove the component named `name` from the entity `e`
     *
     * Any destroy logic associated with `name` will be invoked.
     *
     * @param e The entity
     * @param name The name of the component
     */
    remove(e, name) {
        return this.component(name).remove(e);
    }
    /**
     * Tests if the entity `e` has the a component named `name`
     *
     * @param e The entity
     * @param name The name of the component
     */
    hasComponent(e, name) {
        return this.component(name).contains(e);
    }
    /**
     * Constructs a [[View]] of components.
     *
     * Not sure why you would use this over the faster [[CachedView]], might be
     * obsolete.
     *
     * @param components The stores or names of the components
     */
    view(components) {
        let stores = [];
        for (let i = 0; i < components.length; i++) {
            if (typeof components[i] === "string")
                stores.push(this.component(components[i]));
            else
                stores.push(components[i]);
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
    newCachedView(components) {
        let stores = [];
        for (let i = 0; i < components.length; i++) {
            if (typeof components[i] === "string")
                stores.push(this.component(components[i]));
            else
                stores.push(components[i]);
        }
        return new CachedView(stores);
    }
    /**
     * Get a view of every entity that has all `components`
     *
     * @todo this could be faster
     *
     * @param components The stores or names of the components
     */
    query(components) {
        return this.newCachedView(components);
    }
    /**
     * Crimes are comitted here
     *
     * @param func Function to extract component names from
     */
    _getComponentParamNames(func) {
        const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
        const ARGUMENT_NAMES = /([^\s,\(\)]+)/g;
        let argCount = func.length;
        if (argCount === 0)
            return [];
        let fnStr = func.toString().replace(STRIP_COMMENTS, '').replace("function", '');
        let argStr = fnStr.slice(0, fnStr.match(/=>|\{/).index);
        let destructuring = argStr.indexOf('[') !== -1;
        var result = argStr.slice(argStr.indexOf('[') + 1, argStr.indexOf(']')).match(ARGUMENT_NAMES);
        if (result === null)
            result = [];
        if (argCount === 2 && !destructuring)
            result.pop();
        return result;
    }
    getCachedView(components) {
        let componentsString = components.toString();
        if (!this.viewCache.has(componentsString)) {
            this.viewCache.set(componentsString, this.newCachedView(components));
        }
        return this.viewCache.get(componentsString);
    }
    addCreateSystem(components, f) {
        if (components.length === 0)
            return;
        let view = components.length === 1 ? this.component(components[0]) : this.getCachedView(components);
        view.oncreate = f;
    }
    oncreate(f) {
        let components = this._getComponentParamNames(f);
        this.addCreateSystem(components, f);
    }
    addDestroySystem(components, f) {
        if (components.length === 0)
            return;
        let view = components.length === 1 ? this.component(components[0]) : this.getCachedView(components);
        view.ondestroy = f;
    }
    ondestroy(f) {
        let components = this._getComponentParamNames(f);
        this.addDestroySystem(components, f);
    }
    addUpdateSystem(components, f) {
        if (components.length === 0)
            return;
        let view = components.length === 1 ? this.component(components[0]) : this.getCachedView(components);
        this.updateSystems.push(() => view.each(f));
    }
    onupdate(f) {
        let components = this._getComponentParamNames(f);
        this.addUpdateSystem(components, f);
    }
    // ******
    // ** entities
    // ******
    create(spec) {
        let newEntity = this.registry.create();
        for (const prop in spec) {
            let store = this.component(prop);
            store.assign(newEntity, spec[prop]);
        }
        return newEntity;
    }
    destroy(entity) {
        for (const name in this.components) {
            this.components[name].remove(entity);
        }
        this.registry.destroy(entity);
    }
    // ******
    // ** update
    // ******
    update() {
        let length = this.updateSystems.length;
        for (let i = 0; i < length; i++) {
            this.updateSystems[i]();
        }
    }
}
exports.ECS = ECS;
exports.default = new ECS();
