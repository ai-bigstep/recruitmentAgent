
from typing import Optional
from google.genai import types
from google.adk.agents.callback_context import CallbackContext
from google.adk.models import LlmResponse, LlmRequest
from rich import print

def before_model_guardrail(
    callback_context: CallbackContext, llm_request: LlmRequest
) -> Optional[LlmResponse]:
    """Restricts assistant to Tata Motors automobile topics and blocks unrelated/personal queries."""

    agent_name = callback_context.agent_name
    print(f"[Callback] Before model call for agent: {agent_name}")

    # Extract the last user message
    last_user_message = ""
    if llm_request.contents and llm_request.contents[-1].role == 'user':
        if llm_request.contents[-1].parts:
            last_user_message = llm_request.contents[-1].parts[0].text or ""

    message_lower = last_user_message.lower()
    print(f"[Callback] Inspecting user message: '{message_lower}'")

    # Keywords allowed (relaxed/lax Tata and auto context)
    tata_keywords = [
        "tata", "tata car", "tata motors", "tata vehicle", "tata service", "tata showroom",
        "nexon", "harrier", "safari", "punch", "altroz", "tigor", "tiago", "curvv", "avinya", "ev", "tata ev",
        "car", "vehicle", "suv", "sedan", "hatchback", "electric car", "engine", "mileage", "price",
        "features", "on-road price", "car loan", "insurance", "test drive", "maintenance", "service center",
        "book car", "car booking", "compare cars", "fuel", "battery", "automatic", "manual"
    ]

    # Blocked personal/unrelated terms
    unrelated_keywords = [
        "joke", "birthday", "love you", "hate", "who are you", "who made you",
        "are you single", "tell me about yourself", "religion", "politics", "smile",
        "friend", "marry", "relationship", "personal", "your age", "crush"
    ]

    # BLOCK if clearly unrelated
    if any(word in message_lower for word in unrelated_keywords):
        print("[Guardrail] Personal/unrelated query detected. Blocking.")
        return LlmResponse(
            content=types.Content(
                role="model",
                parts=[types.Part(text="I'm here to assist with Tata Motors vehicles and services only. Let's stay on topic!")],
            )
        )

    # BLOCK if no Tata or auto keywords found
    # if not any(word in message_lower for word in tata_keywords):
    #     print("[Guardrail] Off-topic query detected. Blocking.")
    #     return LlmResponse(
    #         content=types.Content(
    #             role="model",
    #             parts=[types.Part(text="Please ask something related to Tata Motors cars or services. I'm here to help with that!")],
    #         )
    #     )

    # Optional: Reframe vague queries to Tata context
    if "car" in message_lower and "tata" not in message_lower:
        updated = "Tell me about Tata Motors " + last_user_message.strip()
        llm_request.contents[-1].parts[0].text = updated
        print(f"[Callback] Auto-redirecting to Tata context: '{updated}'")

    # Optionally modify system instruction (optional)
    original_instruction = llm_request.config.system_instruction or types.Content(role="system", parts=[])
    if not isinstance(original_instruction, types.Content):
        original_instruction = types.Content(role="system", parts=[types.Part(text=str(original_instruction))])
    if not original_instruction.parts:
        original_instruction.parts.append(types.Part(text=""))

    prefix = "[Tata Assistant] "
    modified_text = prefix + (original_instruction.parts[0].text or "")
    original_instruction.parts[0].text = modified_text
    llm_request.config.system_instruction = original_instruction

    print(f"[Callback] Modified system instruction to: '{modified_text}'")
    print("[Callback] Proceeding with LLM call.")
    return None  # Allow LLM to proceed