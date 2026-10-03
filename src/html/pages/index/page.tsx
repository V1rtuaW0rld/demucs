import { useState } from "react";
import type { ResultType } from "~/db/schema";
import Form from "./components/form";
import EnhancerForm from "./components/enhancer-form";
import ResultItem from "./components/result-item";
import { cn } from "~/lib/utils";

interface IndexProps {
  results: ResultType[];
}

export default function Index({ results }: IndexProps) {
  const [tab, setTab] = useState<"splitter" | "enhancer">("splitter");

  return (
    <main className="flex w-full flex-col items-center space-y-8 px-6 py-12 lg:pt-20">
      <div className="flex flex-col items-center space-y-4 text-center">
        <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          {tab === "splitter" ? "Audio Separation Studio" : "Vocal Enhancer Studio"}
        </h1>
        <p className="max-w-lg text-muted-foreground">
          {tab === "splitter"
            ? "Isolate vocals and instruments with state-of-the-art AI models."
            : "Clean, de-reverb, and warm up your vocals for a professional sound."}
        </p>
      </div>

      <div className="flex p-1 bg-muted/50 rounded-lg border">
        <button
          onClick={() => setTab("splitter")}
          className={cn("px-6 py-2 rounded-md text-sm font-medium transition-all", tab === "splitter" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
        >
          Audio Splitter
        </button>
        <button
          onClick={() => setTab("enhancer")}
          className={cn("px-6 py-2 rounded-md text-sm font-medium transition-all", tab === "enhancer" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
        >
          Vocal Enhancer
        </button>
      </div>

      {tab === "splitter" ? <Form /> : <EnhancerForm />}

      <div className="w-full max-w-lg border-t pt-8 mt-8">
        <h3 className="text-lg font-semibold mb-4">Task History</h3>
        <div className="flex w-full flex-col items-center">
          {results.length > 0 ? (
            results.map((result) => (
              <ResultItem initialData={result} key={result.id} />
            ))
          ) : (
            <p className="text-sm text-muted-foreground py-4">No tasks yet.</p>
          )}
        </div>
      </div>
    </main>
  );
}
