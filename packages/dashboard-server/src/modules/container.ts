import type { Client } from "@libsql/client";
import type { Ctor } from "../utils/ctor.type.js";
import { nn } from "../utils/nn.util.js";
import { Log } from "../log.js";

type Singleton = {
  db: Client;
};
type SingletonItem<T> = {
  [K in keyof Singleton]: T extends Singleton[K] ? K : never;
}[keyof Singleton];
type MapDeps<T extends any[]> = {
  [K in keyof T]: SingletonItem<T[K]> extends never ? Ctor<T[K]>
  : SingletonItem<T[K]>;
};
type Dependencies<T extends Ctor> = MapDeps<ConstructorParameters<T>>;

class InjectionContainer {
  private readonly log = Log.child({ module: "Container" });
  private readonly ctors = new Map<Ctor, unknown[]>();
  private readonly singletons = new Map<string | Ctor, unknown>();
  private readonly cache = new Map<Ctor, unknown>();

  public register<C extends Ctor>(ctor: C, deps: Dependencies<C>) {
    this.ctors.set(ctor, deps);
  }

  public registerSingleton<K extends keyof Singleton>(
    key: K,
    value: Singleton[K]
  ) {
    this.singletons.set(key, value);
  }

  public getInstance<T>(ctor: Ctor<T>): T {
    if (this.cache.has(ctor)) {
      this.log.trace(
        `Constructor ${ctor.name} already instantiated, returning existing instance`
      );
      return nn(this.cache.get(ctor) as T);
    }
    const requirements = this.ctors.get(ctor);
    if (requirements == null) {
      throw new Error(`Failed to find dependencies for: ${ctor.name}`);
    }
    this.log.trace(
      `Resolving constructor ${ctor.name}, requirements: ${requirements.map((r) => (typeof r === "string" ? r : (r as any).name)).join(", ")}`
    );
    const instances = requirements.map((r) => {
      if (typeof r === "string") {
        return nn(this.singletons.get(r));
      }
      return this.getInstance(r as Ctor<unknown>);
    });

    const instance = new ctor(...instances);
    this.cache.set(ctor, instance);
    return instance;
  }
}

export const Container = new InjectionContainer();
