import { useCallback, useState, useEffect } from "react";
import { Button } from "./components/ui/button";
import { evaluate, derivative } from "mathjs";
import { Input } from "./components/ui/input";
import Plot from "react-plotly.js";
import "katex/dist/katex.min.css";
import { BlockMath } from "react-katex";
import { Play, Pause, ChevronRight, ChevronLeft } from "lucide-react";
import { Slider } from "./components/ui/slider";

function App() {
  const [justCalculated, setJustCalculated] = useState(false);
  const [expression, setExpression] = useState("x^2 - 2");
  const [startingGuess, setStartingGuess] = useState("1");
  const [tolerance, setTolerance] = useState("0.000001");
  const [maxIterations, setMaxIterations] = useState("20");
  const [isPlaying, setIsPlaying] = useState(true);
  const [data, setData] = useState<{
    xValues: number[];
    yValues: number[];
    derivativeValues: number[];
  } | null>(null);
  const [root, setRoot] = useState<number | null>(null);
  const [steps, setSteps] = useState<
    { iteration: number; x: number; fx: number; error: number }[]
  >([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [convergenceWarning, setConvergenceWarning] = useState(false);

  const generateData = useCallback(() => {
    const xValues = [];
    const yValues = [];
    const derivativeValues = [];

    const center = parseFloat(startingGuess);
    const range = 20;
    const step = 0.1;

    try {
      const derivativeExpr = derivative(expression, "x").toString();

      for (let x = center - range; x <= center + range; x += step) {
        try {
          const y = evaluate(expression, { x });
          const dy = evaluate(derivativeExpr, { x });
          xValues.push(x);
          yValues.push(y);
          derivativeValues.push(dy);
        } catch {
          xValues.push(x);
          yValues.push(NaN);
          derivativeValues.push(NaN);
        }
      }
    } catch (error) {
      console.error("Error calculating derivative:", error);
      return;
    }

    setData({ xValues, yValues, derivativeValues });
    setCurrentStepIndex(-1);
  }, [expression, startingGuess]);

  const calculateNewtonRaphson = useCallback(() => {
    setJustCalculated(true);

    let x = parseFloat(startingGuess);
    const iterationSteps = [];
    const tol = parseFloat(tolerance);
    const max = parseInt(maxIterations);
    const firstDerivativeExpr = derivative(expression, "x").toString();
    const secondDerivativeExpr = derivative(
      derivative(expression, "x"),
      "x"
    ).toString();

    try {
      const fx = evaluate(expression, { x });
      const f1x = evaluate(firstDerivativeExpr, { x });
      const f2x = evaluate(secondDerivativeExpr, { x });
      const convergenceFactor = Math.abs((fx * f2x) / (f1x * f1x));

      if (convergenceFactor >= 1 || isNaN(convergenceFactor)) {
        setConvergenceWarning(true);
        return; // Stop here — don't continue if not converging
      } else {
        setConvergenceWarning(false);
      }
    } catch {
      setConvergenceWarning(true);
      return; // Also stop if something errors out
    }

    for (let iteration = 0; iteration < max; iteration++) {
      const fx = evaluate(expression, { x });
      const dfx = evaluate(firstDerivativeExpr, { x });
      const error = Math.abs(fx);

      iterationSteps.push({ iteration, x, fx, error });

      if (error < tol) break;
      if (dfx === 0) {
        console.error("Zero derivative — Newton-Raphson fails.");
        break;
      }

      x = x - fx / dfx;
    }

    setRoot(x);
    setSteps(iterationSteps);
    setCurrentStepIndex(0);
    setIsPlaying(true);
  }, [expression, startingGuess, tolerance, maxIterations]);

  useEffect(() => {
    if (
      isPlaying &&
      justCalculated &&
      currentStepIndex >= 0 &&
      currentStepIndex < steps.length - 1
    ) {
      const timer = setTimeout(() => {
        setCurrentStepIndex((prev) => prev + 1);
        setJustCalculated(false); // prevent auto-play from triggering again
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isPlaying, currentStepIndex, steps.length, justCalculated]);

  const getStepData = () => {
    if (currentStepIndex < 0 || currentStepIndex >= steps.length) return [];

    const step = steps[currentStepIndex];
    const center = step.x;
    const range = 10;
    const stepSize = 0.1;

    const xValues: number[] = [];
    const yValues: number[] = [];
    const derivativeValues: number[] = [];

    const derivativeExpr = derivative(expression, "x").toString();

    for (let x = center - range; x <= center + range; x += stepSize) {
      try {
        const y = evaluate(expression, { x });
        const dy = evaluate(derivativeExpr, { x });
        xValues.push(x);
        yValues.push(y);
        derivativeValues.push(dy);
      } catch {
        xValues.push(x);
        yValues.push(NaN);
        derivativeValues.push(NaN);
      }
    }

    const fx = step.fx;
    const dfx = evaluate(derivativeExpr, { x: step.x });
    const tangentX = [step.x - 2, step.x + 2];
    const tangentY = tangentX.map((x) => fx + dfx * (x - step.x));

    return [
      {
        x: xValues,
        y: yValues,
        type: "scatter" as const,
        mode: "lines",
        name: "f(x)",
        marker: { color: "blue" },
        line: { shape: "spline" },
      },
      {
        x: [step.x],
        y: [fx],
        type: "scatter" as const,
        mode: "markers",
        name: "Current Point",
        marker: { color: "green", size: 10 },
      },
      {
        x: tangentX,
        y: tangentY,
        type: "scatter" as const,
        mode: "lines",
        name: "Tangent Line",
        line: { color: "orange", dash: "dash" },
      },
    ];
  };

  function getPrecisionFromTolerance(tol: string): number {
    const num = parseFloat(tol);
    if (isNaN(num) || num <= 0) return 2;
    return Math.max(0, -Math.floor(Math.log10(num)));
  }

  return (
    <div className="min-h-screen pb-24 p-8 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white flex flex-col items-center gap-8">
      <h1 className="text-3xl font-bold">Newton-Raphson Method</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          generateData();
          calculateNewtonRaphson();
        }}
        className="flex flex-wrap gap-4 justify-center"
      >
        <div className="flex flex-col">
          <label htmlFor="expression">Function</label>
          <Input
            id="expression"
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            placeholder="x^2 - 2"
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="guess">Starting Guess</label>
          <Input
            id="guess"
            value={startingGuess}
            onChange={(e) => setStartingGuess(e.target.value)}
            placeholder="1"
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="tolerance">Error Tolerance</label>
          <Input
            id="tolerance"
            value={tolerance}
            onChange={(e) => setTolerance(e.target.value)}
            placeholder="0.000001"
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="maxIterations">Max Iterations</label>
          <Input
            id="maxIterations"
            value={maxIterations}
            onChange={(e) => setMaxIterations(e.target.value)}
            placeholder="20"
          />
        </div>
        <div className="flex items-end">
          <Button type="submit">Calculate</Button>
        </div>
      </form>

      {data && (
        <div className="text-center space-y-2">
          <BlockMath math={`f(x) = ${expression}`} />
          <BlockMath
            math={`f'(x) = ${derivative(expression, "x").toString()}`}
          />
        </div>
      )}

      {convergenceWarning && (
        <div className="bg-yellow-100 dark:bg-yellow-900 text-red-700 dark:text-red-300 border border-red-400 rounded px-4 py-2 text-sm max-w-xl text-center">
          ⚠️ This function may not converge with the given starting guess.
        </div>
      )}

      <div className="w-full max-w-6xl flex flex-col md:flex-col lg:flex-row gap-8 items-center">
        {data && root !== null && (
          <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-8 items-center  ">
            {/* graph */}
            <div className="flex-1 w-full">
              <Plot
                data={getStepData() as Partial<Plotly.Data>[]}
                layout={{
                  title: `Newton-Raphson Iteration ${
                    currentStepIndex >= 0 ? currentStepIndex + 1 : ""
                  }`,
                  xaxis: { title: "x" },
                  yaxis: { title: "y" },
                  autosize: true,
                  paper_bgcolor: "transparent",
                  plot_bgcolor: "transparent",
                  transition: { duration: 500, easing: "cubic-in-out" },
                }}
                config={{ responsive: true, displayModeBar: false }}
                style={{ width: "100%", height: "500px" }}
              />
            </div>

            {/* table */}
            <div className="flex-1 w-full overflow-auto max-h-[400px] border-y">
              <BlockMath
                math={
                  root !== null
                    ? `\\text{Root found: } x = ${root.toFixed(6)}`
                    : `\\text{Did not converge to a root}`
                }
              />
              <table className="w-full text-left border-collapse mt-4">
                <thead>
                  <tr>
                    <th className="border-b p-2">Iteration</th>
                    <th className="border-b p-2">x</th>
                    <th className="border-b p-2">f(x)</th>
                    <th className="border-b p-2">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {steps.map((step) => (
                    <tr
                      key={step.iteration}
                      className={
                        step.iteration === currentStepIndex
                          ? "bg-yellow-100 dark:bg-yellow-900"
                          : ""
                      }
                    >
                      <td className="border-b p-2">{1 + step.iteration}</td>
                      <td className="border-b p-2">
                        {step.x.toFixed(getPrecisionFromTolerance(tolerance))}
                      </td>
                      <td className="border-b p-2">
                        {step.fx.toFixed(getPrecisionFromTolerance(tolerance))}
                      </td>
                      <td className="border-b p-2">
                        {step.error.toFixed(
                          getPrecisionFromTolerance(tolerance)
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* bottom section */}
      {steps.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t dark:border-gray-700 px-6 py-3 flex items-center justify-center z-50">
          <div className="flex gap-4 items-center">
            <button
              className="hover:opacity-50"
              onClick={() => setCurrentStepIndex((i) => Math.max(i - 1, 0))}
              disabled={currentStepIndex <= 0}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              className="hover:opacity-50"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6" />
              )}
            </button>

            <button
              className="hover:opacity-50"
              onClick={() =>
                setCurrentStepIndex((i) => Math.min(i + 1, steps.length - 1))
              }
              disabled={currentStepIndex >= steps.length - 1}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          <Slider
            min={0}
            max={steps.length - 1}
            step={1}
            value={[currentStepIndex]}
            onValueChange={([value]) => {
              setIsPlaying(false);
              setCurrentStepIndex(value);
            }}
            className="w-full max-w-xl mx-6"
          />

          <span className="text-sm w-fit whitespace-nowrap font-mono">
            Step {currentStepIndex + 1} / {steps.length}
          </span>
        </div>
      )}
    </div>
  );
}

export default App;
