import React, { useRef } from 'react';
import { CanvasModel } from '../../dist/index';
import AutoSizer from 'react-virtualized-auto-sizer';
const SPEED = 5;

type Ball = {
  originalHue: number;
  currentHue: number;
  x: number;
  y: number;
  r: number;
  vh: number;
  vx: number;
  vy: number;
};

export const Page = () => {
  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <AutoSizer>
        {({ height, width }) => <Balls height={height} width={width} />}
      </AutoSizer>
    </div>
  );
};

const Balls = ({ height, width }) => {
  const canvas = useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    const ctx = canvas?.current?.getContext('2d');
    const initialParams = {
      nbBalls: 50,
      height,
      width,
      maxr: 10,
      minr: 100,
    };
    if (ctx !== null) {
      const model = new CanvasModel<Ball[]>({
        ctx,
        initData: initData({ height, width }),
        initialParams,
        updateData: updateData({ height, width }),
        render: render({ height, width }),
        maxTime: Infinity,
      });
      model.play();
    }
  }, [height, width]);
  return <canvas ref={canvas} height={height} width={width} />;
};

function initData(
  { height, width }: { height: number; width: number },
  random: () => number = Math.random
) {
  return ({ nbBalls, minr, maxr}) => {
    const data = [...Array(nbBalls).keys()].map((ball) => {
      const angle = random() * 2 * Math.PI;
      const hue = random() * 360;
      const r = minr + random() * random() * (maxr - minr);
      return {
        originalHue: hue,
        currentHue: hue,
        r,
        x: r / 2 + random() * (Math.max(width, 500) - r),
        y: r / 2 + random() * (Math.max(height, 500) - r),
        vh: 0,
        vx: SPEED * Math.cos(angle),
        vy: SPEED * Math.sin(angle),
      };
    });
    return data;
  };
}

function render({ height, width }) {
  return ({
    ctx,
    circle,
    data,
  }: {
    ctx: CanvasRenderingContext2D;
    circle: (args: { x: number; y: number; r: number }) => void;
    data: Ball[];
  }) => {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#f1f7ef';
    ctx.fillRect(0, 0, width, height);

    ctx.globalCompositeOperation = 'overlay';
    data.forEach((ball) => {
      if (ball) {
        ctx.fillStyle = `hsl(${ball.currentHue}, 90%, 20%)`;
        circle(ball);
        ctx.fill();
      }
    });
  };
}

function updateData({ height, width }: { height: number; width: number }) {
  return ({ data }: { data: Ball[] }) => {
    const updatedData = data.map((ball) => {
      ball.x = ball.x + ball.vx;
      ball.y = ball.y + ball.vy;
      // bouncing on walls
      if (
        (ball.vy < 0 && ball.y < ball.r) ||
        (ball.vy > 0 && ball.y > height - ball.r)
      ) {
        ball.vy = -ball.vy;
      }

      if (
        (ball.vx < 0 && ball.x < ball.r) ||
        (ball.vx > 0 && ball.x > width - ball.r)
      ) {
        ball.vx = -ball.vx;
      }
      return ball;
    });
    return updatedData;
  };
}
