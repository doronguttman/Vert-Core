import { appConfig } from '../config'
import { TConstructor } from '../types'
import { injectableIndicator } from './deco.injectable'

const isDev = process.env.NODE_ENV === 'development'
const isProd = process.env.NODE_ENV === 'production'

/**
 * Inject decorator for class.
 *
 * @description
 * Provide ability to use other class in DI-way.
 *
 * @param Providers
 * @return {(target: any) => any}
 * @constructor
 */
function Inject (...Providers): any {
  return function (targetClass: any) {
    return createInjectedConstructor(targetClass, Providers)
  }
}

/**
 * Class a class that has already been injected.
 *
 * @param {*} targetClass
 * @param {TProviders} Providers
 * @return {*}
 */
function createInjectedConstructor (targetClass: any, Providers: TProviders): any {
  const providers = Providers.map(createProviderInstance)
  const Constructor: any = function () {
    return new targetClass(...providers)
  }
  Constructor.prototype = targetClass.prototype
  return Constructor
}

/**
 * Inject factory function.
 *
 * @param {T} targetClass
 * @param {any[]} Providers
 * @return {T}
 */
function injectFactory<T extends TConstructor> (
  targetClass: T,
  Providers: { [name: string]: TProvider } = {}
): T {
  Object.keys(Providers).forEach(providerName => {
    const Provider = Providers[providerName]
    targetClass.prototype[providerName] = createProviderInstance(Provider)
  })
  return targetClass
}

/**
 * Create provider instance.
 *
 * @param {TProvider} Provider
 * @return {any}
 */
function createProviderInstance (Provider: TProvider) {
  const [_Provider, _args] = getConstructorFromProvider(Provider)

  // Target must be signed with "$$isInjectable"
  if (_Provider[injectableIndicator] !== true) {
    const errorMsg = `[${appConfig.name}] Class "${_Provider.name}" can't be injected because it is non-injectable. ` +
      `Please decorate it with "Service" before injection.`

    if (isDev) {
      throw new TypeError(errorMsg)
    }

    if (isProd) {
      console.error(errorMsg)
      return
    }
  }

  const instance = createInstanceExec(_Provider, _args)
  return instance
}

type TProvider = TConstructor | [TConstructor, any[]]
type TProviders = TProvider[]

export {
  Inject,
  createInjectedConstructor,
  createProviderInstance,
  injectFactory,
  getConstructorFromProvider,
  TProvider,
  TProviders
}

function createInstanceExec (Provider: TConstructor, args: any[]) {
  const instance = new Provider(...args)
  Object.defineProperty(instance, '$$providerName', {
    value: Provider.prototype.constructor.name
  })
  return instance
}

/**
 * Get the constructor function from TProvider param.
 *
 * @param {TProvider} Provider
 * @return {[TConstructor , any[]]}
 */
function getConstructorFromProvider (Provider: TProvider): [TConstructor, any[]] {
  let _Provider = null
  let _args = []

  const type = typeof Provider
  if (type === 'object' || type === 'function') {
    if (Array.isArray(Provider)) {
      _Provider = Provider[0]
      _args = Provider[1]
    } else {
      _Provider = Provider
    }
  } else {
    const errorMsg = `[${appConfig.name}] Provider is neither an Array nor an Object. ` +
      `You can not get a constructor from a non-object variable.`

    if (isDev) {
      throw new TypeError(errorMsg)
    }

    if (isProd) {
      console.error(errorMsg)
    }
  }

  return [_Provider, _args]
}