from typing import Optional
from google.genai import types
from google.adk.agents.callback_context import CallbackContext
from google.adk.models import LlmResponse, LlmRequest
from rich import print

def before_model_guardrail(
    callback_context: CallbackContext, llm_request: LlmRequest
) -> Optional[LlmResponse]:
    """Guardrail to handle sensitive topics for Godrej Properties assistant, keeping it natural, humorous, and buyer-friendly."""

    agent_name = callback_context.agent_name
    print(f"[Callback] Before model call for agent: {agent_name}")

    # Extract last user message
    last_user_message = ""
    if llm_request.contents and llm_request.contents[-1].role == 'user':
        if llm_request.contents[-1].parts:
            last_user_message = llm_request.contents[-1].parts[0].text or ""

    message_lower = last_user_message.lower()
    print(f"[Callback] Inspecting user message: '{message_lower}'")

    # Sensitive or off-topic words we want to intercept
    sensitive_keywords = [
        "religion", "politics", "marry me", "your number", "crush", "single", "date", "relationship", "love you",
        "hate you", "your age", "personal life", "are you human", "boyfriend", "girlfriend",
        "smile", "salary", "where do you live", "sex", "flirt", "kiss", "personal", "joke about politics"
    ]

    # Weird/fun queries allowed to be handled with humor (won't block)
    weird_fun_keywords = [
        "elephant in balcony", "batcave", "moat", "zombie", "aliens", "drone helipad", "bollywood flashmob"
    ]

    # If sensitive/offensive → gracefully deflect
    if any(word in message_lower for word in sensitive_keywords):
        print("[Guardrail] Sensitive/off-topic detected. Deflecting gracefully.")
        return LlmResponse(
            content=types.Content(
                role="model",
                parts=[types.Part(text=(
                    "Main aapki property expert hoon – personal life meri expertise mein nahi aati 😄. "
                    "Chaliye, ghar ki baat karte hain – aapko kis location mein interest hai?"
                ))],
            )
        )

    # If weird-fun → let it go with humor, handled by prompt or LLM examples
    if any(word in message_lower for word in weird_fun_keywords):
        print("[Guardrail] Fun weird query detected – letting LLM handle with humor.")
        return None

    # Mild fallback for fully off-topic (no real estate, no weird fun)
    real_estate_keywords = [
        "property", "thane", "mumbai", "ghodbunder", "kandivali", "wadala", "house", "flat", "apartment",
        "visit", "price", "2bhk", "3bhk", "booking", "loan", "emi", "brochure", "floor plan", "buy",
        "purchase", "project", "site visit", "location", "investment", "builder", "possession",
        "construction", "amenities", "nearby schools"
    ]

    if not any(word in message_lower for word in real_estate_keywords):
        print("[Guardrail] Mild off-topic detected. Redirecting gently to property discussion.")
        return LlmResponse(
            content=types.Content(
                role="model",
                parts=[types.Part(text=(
                    "Woh interesting sawaal hai, lekin main yahan Godrej Properties ke gharon mein madad ke liye hoon. "
                    "Bataiye, Mumbai side dekh rahe hain ya Thane?"
                ))],
            )
        )

    # Proceed normally for normal real estate queries
    print("[Callback] Proceeding with LLM call.")
    return None
