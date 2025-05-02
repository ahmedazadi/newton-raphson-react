declare module "react-katex" {
  import { ReactNode } from "react";

  interface BlockMathProps {
    math: string;
    children?: ReactNode;
  }

  export const BlockMath: React.FC<BlockMathProps>;
}
