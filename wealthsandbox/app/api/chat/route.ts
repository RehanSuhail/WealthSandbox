// ─── Chat API (Streaming + Role-Aware) ────────────────────────────────────────
// POST: Send messages to WealthBot (client) or WealthAdvisor AI (advisor),
// get streaming response differentiated by user role.

import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sandboxes, sessions } from "@/lib/storage";
import { streamChatResponse } from "@/lib/llm";
import type { SandboxContext } from "@/lib/llm/prompts";
import type { ChatMessage } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const body = await req.json();
    const { messages, sandboxId } = body as {
      messages: ChatMessage[];
      sandboxId?: string;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages required" }), { status: 400 });
    }

    // Determine user role for role-differentiated chat
    const userRole = user.role === "advisor" ? "advisor" as const : "client" as const;

    // Build sandbox context if sandboxId provided
    let sandboxContext: SandboxContext | null = null;
    if (sandboxId) {
      const sandbox = sandboxes.getById(sandboxId);
      if (sandbox) {
        const latestSession = sessions.getLatestForSandbox(sandboxId);
        const retIdx = ((sandbox.sliderState.retirementAge as number) || 65) - (user.profile?.age || 35);

        sandboxContext = {
          portfolioType: sandbox.portfolioType,
          sliderState: sandbox.sliderState as Record<string, number | string>,
          goals: sandbox.goals.map((g) => ({
            label: g.label,
            targetYear: g.targetYear,
            targetAmount: g.targetAmount,
          })),
          simulationResults: {
            p50AtRetirement: latestSession?.chartP50?.[retIdx] || 0,
            probabilityOfSuccess: latestSession?.probSuccess || 0,
            fundsLastToAge: latestSession?.fundsLastToAge || 0,
            monthlySustainableWithdrawal: latestSession?.monthlySustainableWithdrawal || 0,
          },
          stressTests: latestSession?.stressTestsRun.map((st) => ({
            scenario: st.scenario,
            impactPct: st.impactPct,
          })),
          userAge: user.profile?.age,
          riskLevel: user.profile?.riskScore,
          // Pass extended context for advisor-level analysis
          taxBracket: user.profile?.taxBracket,
          familyStatus: user.profile?.familyStatus,
          netWorth: user.profile?.netWorth,
          hasAdvisor: !!user.advisorId,
        };
      }
    }

    // Stream response using Web Streams API for Next.js App Router
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamChatResponse(messages, sandboxContext, userRole)) {
            const data = `data: ${chunk}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("[Chat Stream] Error:", error);
          controller.enqueue(
            encoder.encode(
              `data: I'm sorry, an error occurred. Please try again.\n\n`
            )
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[Chat] Error:", error);
    return new Response(JSON.stringify({ error: "Chat failed" }), { status: 500 });
  }
}
