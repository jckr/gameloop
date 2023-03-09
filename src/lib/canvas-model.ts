import {
  defaultProps,
  Model,
  ModelProps,
  ModelState,
  RenderDataArgs,
} from './model';

type RenderCanvas<T, U> = RenderDataArgs<T, U> & {
  data: T;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  height: number;
  width: number;
  roundRectangle: (args: RoundRectangle) => void;
  circle: (args: Circle) => void;
};

type RoundRectangle = {
  x: number;
  y: number;
  width: number;
  height: number;
  r?: number;
  tl?: number;
  tr?: number;
  bl?: number;
  br?: number;
};

type Circle = {
  x: number;
  y: number;
  r: number;
};

type CanvasProps<T, U> = Partial<{
  canvas?: HTMLCanvasElement;
  ctx?: CanvasRenderingContext2D;
  height?: number;
  width?: number;
  render: (args: RenderCanvas<T, U>) => void;
}>;

export const roundRectangleWithCtx = (
  args: RoundRectangle,
  ctx: CanvasRenderingContext2D
) => {
  const r = args.r ?? 1;
  const { x, y, width, height } = args;
  const topLeft = args.tl ?? r;
  const topRight = args.tr ?? r;
  const bottomLeft = args.bl ?? r;
  const bottomRight = args.br ?? r;

  ctx.beginPath();
  ctx.moveTo(x + topLeft, y);
  ctx.lineTo(x + width - topRight, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + topRight);
  ctx.lineTo(x + width, y + height - bottomRight);
  ctx.quadraticCurveTo(
    x + width,
    y + height,
    x + width - bottomRight,
    y + height
  );
  ctx.lineTo(x + bottomLeft, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - bottomLeft);
  ctx.lineTo(x, y + topLeft);
  ctx.quadraticCurveTo(x, y, x + topLeft, y);
  ctx.closePath();
};

export const circleWithCtx = (args: Circle, ctx: CanvasRenderingContext2D) => {
  const { r, x, y } = args;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.closePath();
};

export class CanvasModel<T = any, U = any, V = any> extends Model<T, U, V> {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private height: number;
  private width: number;

  circle: (args: Circle) => void;
  roundRectangle: (args: RoundRectangle) => void;
  renderWithCanvas: (args: RenderCanvas<T, U>) => void;

  constructor(allProps: CanvasProps<T, U> & Partial<ModelProps<T, U, V>>) {
    const { canvas, ctx, height, width, render, ...props } = allProps;
    super(props);
    if (ctx) {
      this.ctx = ctx;
      this.canvas = ctx.canvas;
    } else {
      if (canvas) {
        this.canvas = canvas;
        let getContext = canvas.getContext('2d');
        if (getContext === null) {
          throw `Couldn't get 2d context from canvas`;
        }
        this.ctx = getContext;
      } else {
        throw `Neither context nor canvas provided`;
      }
    }
    if (ctx === null || ctx === undefined) {
      throw 'Cannot resolve 2d context.';
    }
    this.height = height ?? this.canvas.height;
    this.width = width ?? this.canvas.width;

    this.circle = (args: Circle) => circleWithCtx(args, ctx);
    this.roundRectangle = (args: RoundRectangle) =>
      roundRectangleWithCtx(args, ctx);

    if (render) {
      this.renderWithCanvas = render;
    } else {
      this.renderWithCanvas = (args: RenderCanvas<T, U>) => {};
    }
  }
  render() {
    this.renderWithCanvas({
      cachedData: this.state.cachedData,
      data: this.state.data,
      params: this.state.params,
      tick: this.state.tick,

      canvas: this.canvas,
      circle: this.circle,
      ctx: this.ctx,
      height: this.height,
      roundRectangle: this.roundRectangle,
      width: this.width,
    });
  }
}
