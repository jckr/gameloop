type Param = boolean | number | string | null;
type Params = Record<string, Param>;

export type ModelState<T, U> = {
  cachedData: Record<number, T>;
  cachedDataKeys: Set<number>;
  cachedDataKeysQueue: number[];
  canPlay: boolean;
  data: T;
  isPlaying: boolean | null;
  maxTick: number;
  params: Params;
  results: U[];
  tick: number;
  time: DOMHighResTimeStamp | null;
  timer: number | null;
};

export type RenderDataArgs<T> = {
  cachedData?: Record<number, T>;
  data?: T;
  tick?: number;
  params?: Params;
};

type UpdateData<T, U> = RenderDataArgs<T> & {
  complete: (result: U) => void;
  stop: () => void;
  pause: () => void;
};

type DefaultProps = {
  clearsDataCacheOnReset: boolean;
  clearsResultsCacheOnReset: boolean;
  dataCacheSize: number;
  delay: number;
  initialTick: number;
  maxTime: number;
  minTime: number;
  resetsOnChange: boolean;
  resultsCacheSize: number;
  ticksPerAnimation: number;
};

// type DataProps<T, U> = {
//   initData: (params?: Params) => T;
//   updateData: (args: UpdateData<T, U>) => T;
//   render: (args: RenderDataArgs<T>) => void;
// };

type DataProps<T, U> = {
  initData: (params?: any) => T;
  updateData: (args: any) => T;
  render: (args: any) => void;
};


type OptionalProps<T> = {
  initialParams: Params;
};

export type ModelProps<T, U> = DataProps<T, U> & Partial<OptionalProps<T>> & DefaultProps;

export const defaultProps = {
  clearsDataCacheOnReset: true,
  clearsResultsCacheOnReset: true,
  dataCacheSize: 0,
  delay: 0,
  initialTick: 0,
  maxTime: 100,
  minTime: 0,
  resetsOnChange: true,
  resultsCacheSize: 0,
  ticksPerAnimation: 1,
};

export class Model<T = any, U = any> {
  protected props: ModelProps<T, U>;
  protected state: ModelState<T, U>;

  constructor(props: Partial<ModelProps<T, U>>) {
    this.props = {
      ...defaultProps,
      initData: () => ({} as T),
      render: () => {},
      updateData: () => ({} as T),
      ...props,
    };
    this.state = reset(this.props);
  }

  /**
   * Moves the model further.
   * @param {DOMHighResTimeStamp} timestamp - The time to which the model must advance.
   */
  private advance(timestamp: DOMHighResTimeStamp = performance.now()) {
    if (checkCanPlay(this.state.tick, this.props.maxTime, this.state)) {
      if (this.state.time === null) {
        this.state.time = timestamp;
      }
      // if there is a delay specified, we're only going
      // to update the state if we are passed that delay
      if (timestamp - this.state.time >= this.props.delay) {
        this.state.time = timestamp;
        updateToTick({
          target: this.state.tick + this.props.ticksPerAnimation,
          state: this.state,
          props: this.props,
          pause: this.pause.bind(this),
          stop: this.stop.bind(this),
          render: this.render.bind(this),
        });
      }
      // and delay or not, if we can continue looping, we
      // keep on looping
      if (this.state.isPlaying) {
        if (this.state.timer) {
          window.cancelAnimationFrame(this.state.timer);
        }
        this.state.timer = window.requestAnimationFrame(
          this.advance.bind(this)
        );
      }
    }
  }

  /**
   * Updates the data directly.
   * @param {T} data - the data to set.
   */
  //
  setData(data: T) {
    this.state.data = data;

    // This will also stop the timer and reset to the initial tick.
    stopAndCancelTimer(this.state);
    this.state.isPlaying = false;
    this.state.tick = this.props.initialTick;
  }

  /**
   * Updates the params.
   * @param {T} updatedParams - the new params.
   */
  setParams(updatedParams: Params) {
    this.state.params = { ...this.state.params, ...updatedParams };
    if (this.props.resetsOnChange) {
      reset(this.props, this.state);
    }
  }
  /**
   * Stops the simulation.
   */
  stop() {
    stopAndCancelTimer(this.state);
    this.state.isPlaying = false;
    this.state = reset(this.props, this.state);
  }

  /**
   * Starts or resumes the simulation.
   */
  play() {
    this.state.isPlaying = true;
    this.state.timer = window.requestAnimationFrame(this.advance.bind(this));
  }

  /**
   * Pauses the simulation.
   */
  pause() {
    stopAndCancelTimer(this.state);
    this.state.isPlaying = false;
  }

  /**
   * Creates a side-effect (such as repainting canvas, updating the DOM) as the simulation ticks.
   */
  render() {
    this.props.render({
      cachedData: this.state.cachedData,
      data: this.state.data,
      params: this.state.params,
      tick: this.state.tick,
    });
  }

  /**
   * Stops the simualtion and moves the tick to a given value.
   * @param {number} target - the tick to which the model must be updated.
   */
  setTick(target: number) {
    stopAndCancelTimer(this.state);
    updateToTick({
      target,
      shouldStop: true,
      state: this.state,
      props: this.props,
      pause: this.pause.bind(this),
      stop: this.stop.bind(this),
      render: this.render.bind(this),
    });
  }

  debugString() {
    console.log({ props: this.props, state: this.state });
  }
}

// unexported functions for "private" methods

/**
 * Resets the simulation and reinitializes the state.
 * @param props: parameters to the model.
 * @param state: the state of the model pre reset.
 * @returns A new state, that only contains cached data.
 */

function reset<T, U>(props: ModelProps<T, U>, state?: ModelState<T, U>): ModelState<T, U> {
  const params = state?.params || props.initialParams || {};
  const data = props.initData(params);
  const tick = props.initialTick ?? props.minTime ?? 0;

  const dataCache =
    state === undefined || props.clearsDataCacheOnReset
      ? {
          cachedData: {},
          cachedDataKeys: new Set<number>(),
          cachedDataKeysQueue: [] as number[],
        }
      : {
          cachedData: state?.cachedData || {},
          cachedDataKeys: new Set([...state.cachedDataKeys] || []),
          cachedDataKeysQueue: [...state.cachedDataKeysQueue] || [],
        };

  const resultsCache =
    props.clearsResultsCacheOnReset || state === undefined
      ? {
          results: [] as U[],
        }
      : {
          results: [...(state.results || [])] as U[],
        };

  return {
    ...dataCache,
    ...resultsCache,
    canPlay: true,
    data,
    isPlaying: state?.isPlaying ?? null,
    maxTick: tick,
    params,
    tick,
    time: null,
    timer: null,
  };
}

/**
 * Checks if the model can go further.
 * @param tick - The tick being tested.
 * @param maxTime - The maximum possible value of the tick.
 * @param state - The current state of the model.
 * @return {boolean} Whether the model can still play.
 */
function checkCanPlay<T, U>(
  tick: number,
  maxTime: number,
  state: ModelState<T, U>
): boolean {
  if (state.canPlay === false || tick > maxTime) {
    state.canPlay = false;
    state.isPlaying = false;
    return false;
  }
  return true;
}

/**
 * Stops the cycle of request animation frame calls, and clears the timer.
 */
function stopAndCancelTimer<T, U>(state: ModelState<T, U>) {
  if (state.timer) {
    window.cancelAnimationFrame(state.timer);
    state.timer = null;
  }
}

/**
 * Fires when the simulation is complete.
 * @param result - The result of the simulation.
 * @param state - The current state of the model.
 * @param props - The parameters of the model.
 * @param stop - A function to stop the simulation.
 */
function complete<T, U>(
  result: U,
  state: ModelState<T, U>,
  props: ModelProps<T, U>,
  stop: () => void
) {
  if (props.resultsCacheSize > 0) {
    state.results.push(result);
    if (state.results.length > props.resultsCacheSize) {
      state.results.shift();
    }
  }
  state.canPlay = false;
  stop();
}

/**
 * Moves the simulation to a given tick.
 * @param target - the tick to which the model must be updated.
 * @param shouldStop - whether the simulation should stop after the tick is reached.
 * @param state - The current state of the model.
 * @param props - The parameters of the model.
 * @param stop - A function to stop the simulation.
 * @param pause - A function to pause the simulation.
 * @param render - A function to render the simulation.
 */
function updateToTick<T, U>({
  target,
  shouldStop = false,
  state,
  props,
  stop,
  pause,
  render,
}: {
  target: number;
  shouldStop?: boolean;
  state: ModelState<T, U>;
  props: ModelProps<T, U>;
  stop: () => void;
  pause: () => void;
  render: () => void;
}) {
  let { data } = state;
  let tick;

  // If we've already computed (and cached) data for a given tick,
  // we'll just retrieve it.
  if (state.cachedDataKeys.has(target)) {
    data = state.cachedData[target];
    tick = target;
  } else {
    // else, we're starting from the last tick for which we cached data.
    // failing that, we start from the current tick.

    if (state.cachedDataKeys.has(state.maxTick)) {
      tick = state.maxTick;
    } else {
      tick = state.tick;
    }

    // note - if data is not cached, and user wants
    // to go back in time, before current tick, nothing
    // will happen

    while (tick < target && checkCanPlay(tick, props.maxTime, state)) {
      // then, we're going to advance tick by one and update data.
      // however, each time we run the updateData, there's a chance
      // that the simulation completes. In this case, we shouldn't go
      // further.
      //
      // this is what the checkCanPlay method addresses. If false, we
      // stop updating data and tick.
      tick++;
      data = props.updateData({
        cachedData: state.cachedData,
        data,
        tick,
        params: state.params,
        complete: (result: U) => complete(result, state, props, stop),
        stop,
        pause,
      });

      // then, we cache the data which is calculated.
      // it's possible to opt out cache, because if there's no maxTime
      // and the dataset is large and the simulation can't complete (open ended)
      // we'll run out of memory eventually.

      if (props.dataCacheSize > 0) {
        state.maxTick = tick;
        state.cachedDataKeysQueue.push(tick);
        if (state.cachedDataKeysQueue.length <= props.dataCacheSize) {
          state.cachedDataKeys.add(tick);
        } else {
          const toRemove = state.cachedDataKeysQueue.shift();
          if (toRemove) {
            delete state.cachedData[toRemove];
            state.cachedDataKeys.delete(toRemove);
          }
        }
        state.cachedData[tick] = data;
      }

      state.data = data;
      state.tick = tick;
      if (shouldStop) {
        state.isPlaying = false;
      }

      render();
    }
  }
}
