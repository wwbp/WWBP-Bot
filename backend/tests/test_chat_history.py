import os
import asyncio
import logging
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.prompts.chat import MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain.memory import ChatMessageHistory

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


class LangChainSessionManager:
    def get_llm_instance(self, session_id):
        try:
            llm = ChatOpenAI(
                model="gpt-4", api_key=""
            )
            prompt = ChatPromptTemplate.from_messages([
                ("system", "You are a helpful assistant."),
                MessagesPlaceholder("history"),
                ("user", "{question}")
            ])
            output_parser = StrOutputParser()
            chain = prompt | llm.with_config(
                {"run_name": "model"}) | output_parser.with_config({"run_name": "Assistant"})
            demo_ephemeral_chat_history = ChatMessageHistory()

            demo_ephemeral_chat_history.add_user_message(
                "Translate this sentence from English to French: I love programming."
            )

            demo_ephemeral_chat_history.add_ai_message(
                "J'adore la programmation.")

            demo_ephemeral_chat_history.messages
            chain_with_history = RunnableWithMessageHistory(
                chain,
                lambda session_id: demo_ephemeral_chat_history,
                input_messages_key="question",
                history_messages_key="history",
            )
            return chain_with_history
        except Exception as e:
            raise Exception(
                f"Error creating LLM instance for session_id {session_id}: {e}"
            )


async def test_langchain():
    session_id = "test_session"
    manager = LangChainSessionManager()
    chain = manager.get_llm_instance(session_id)

    question = "What is the capital of France?"

    try:
        print("Starting chain events...")
        response = await chain.invoke(
            {"question": question},
            config={"configurable": {"session_id": "foo"}}
        )
        print("Response:", response)

        async for chunk in chain.astream_events(
            {"question": "What's its inverse"},
            config={"configurable": {"session_id": "foo"}}
        ):
            print(f"Chunk received: {chunk}")
            if not isinstance(chunk, dict):
                raise TypeError(
                    f"Expected chunk to be a dict, got {type(chunk)}"
                )
            assert "event" in chunk, f"Missing 'event' in chunk: {chunk}"
            assert "data" in chunk, f"Missing 'data' in chunk: {chunk}"
            print(chunk)
    except Exception as e:
        print(f"LangChain test failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_langchain())
