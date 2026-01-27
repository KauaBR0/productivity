declare module 'react-test-renderer' {
  import type * as React from 'react';

  export type ReactTestRenderer = any;
  export type ReactTestInstance = any;

  export function act(callback: () => void | Promise<void>): void | Promise<void>;

  const TestRenderer: {
    create: (element: React.ReactElement) => ReactTestRenderer;
  };

  namespace TestRenderer {
    export type ReactTestRenderer = ReactTestRenderer;
    export type ReactTestInstance = ReactTestInstance;
  }

  export default TestRenderer;
}
