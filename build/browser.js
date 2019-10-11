(function () {
  'use strict';

  // TODO creating a cached view when there are already entities in the registry should grab them
  class ComponentStore {
      constructor(name) {
          this.entities = [];
          this.indices = [];
          this.components = [];
          this.size = 0;
          this.name = name;
          this._fakeThis = { [name]: null };
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
          if (this.oncreate) {
              this._fakeThis[this.name] = component;
              this.oncreate.call(this._fakeThis, entity);
          }
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
          // TODO this is buggy
          if (!this.contains(entity))
              return;
          if (this.ondestroy) {
              this._fakeThis[this.name] = this.components[this.indices[entity]];
              console.log("fake this", this.name, this._fakeThis);
              this.ondestroy.call(this._fakeThis, entity);
          }
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
          componentStore.insert = function (entity, component) {
              oldInsert(entity, component);
              // if entity has all the components then add it to packedComponents
              for (let i = 0; i < __this.componentStores.length; i++) {
                  if (!__this.componentStores[i].contains(entity)) {
                      return;
                  }
              }
              // let packed = new Array(__this.componentStores.length);
              let packed = {};
              for (let i = 0; i < __this.componentStores.length; i++) {
                  packed[__this.componentStores[i].name] = (__this.componentStores[i].get(entity));
              }
              __this.packedComponents.insert(entity, packed);
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
              let idx = componentStore.name;
              let packed = __this.packedComponents.get(entity);
              packed[idx] = component;
          };
      }
      eachEntity(f) { this.packedComponents.eachEntity(f); }
      eachComponent(f) { this.packedComponents.eachComponent(f); }
      each(f) { this.packedComponents.each(f); }
      count() { return this.packedComponents.size; }
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
          this.registry = new Registry();
          this.components = {};
          this.updateSystems = [];
          // createSystems: { [name: string]: (e: Entity, component) => any } = {}
          // destroySystems: { [name: string]: (e: Entity, component) => any } = {}
          this.views = [];
      }
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
          // if (this.destroySystems[name])
          //   this.destroySystems[name](e, this.components[name].get(e))
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
      cachedView(components) {
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
          return this.cachedView(components);
      }
      _getParamNames(func) {
          const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
          const ARGUMENT_NAMES = /([^\s,]+)/g;
          var fnStr = func.toString().replace(STRIP_COMMENTS, '');
          var result = fnStr.slice(fnStr.indexOf('{') + 1, fnStr.indexOf('}')).match(ARGUMENT_NAMES);
          if (result === null)
              result = [];
          return result;
      }
      // onCreate(name, f) {
      //   this.createSystems[name] = f
      // }
      // onDestroy(name, f) {
      //   this.destroySystems[name] = f
      // }
      addUpdateSystem(components, f) {
          let view = components.length === 1 ? this.components[components[0]] : this.cachedView(components);
          this.views.push(view);
          this.updateSystems.push(() => view.each(f));
      }
      // very sugary
      onupdate(f) {
          let components = this._getParamNames(f);
          this.addUpdateSystem(components, f);
      }
      // ******
      // ** entities
      // ******
      create(...specs) {
          let newEntity = this.registry.create();
          for (const spec of specs) {
              if (spec)
                  for (const prop in spec) {
                      console.log("create", spec, spec.ondestroy);
                      let store = this.component(prop);
                      store.oncreate = spec.oncreate;
                      store.ondestroy = spec.ondestroy;
                      store.assign(newEntity, spec[prop]);
                      // if (this.createSystems[prop])
                      //   this.createSystems[prop](newEntity, spec[prop])
                  }
          }
          return newEntity;
      }
      destroy(entity) {
          for (const name in this.components) {
              // if (this.destroySystems[name])
              //   this.destroySystems[name](entity, this.components[name].get(entity))
              this.components[name].remove(entity);
          }
          this.registry.destroy(entity);
      }
      // ******
      // ** set up sugar
      // ******
      init(fns) {
          if (typeof fns === "function") {
              return fns(this);
          }
          else {
              for (const k in fns) {
                  this.init(fns[k]);
              }
          }
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
  var ecs = new ECS();

  ecs.create({
      position: { x: 10, y: 20 },
      health: { value: 100 },
      heal: { speed: 0.2 }
  });
  // lose health if you move past x=100
  ecs.onupdate(({ position, health }) => {
      if (position.x > 100)
          health.value -= 1;
  });
  ecs.onupdate(({ position, health }) => {
      if (position.x > 100)
          health.value -= 1;
  });
  // healers regenerates health
  ecs.onupdate(({ health, heal }) => {
      health.value += heal.speed;
  });
  console.log(ecs.registry.entities);
  // ecs.update()
  // ecs.systems[0]()

}());
//# sourceMappingURL=browser.js.map
