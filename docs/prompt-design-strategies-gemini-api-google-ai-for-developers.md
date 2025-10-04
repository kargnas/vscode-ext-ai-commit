# Prompt design strategies  |  Gemini API  |  Google AI for Developers
Source: https://ai.google.dev/gemini-api/docs/prompting-strategies
[Skip to main content](https://ai.google.dev/gemini-api/docs/prompting-strategies#main-content)

[![Google AI for Developers](https://www.gstatic.com/devrel-devsite/prod/vd661722dc0bf89538e3b1471bfa72ffd39d274bea13001a4422eac953971d84d/googledevai/images/lockup-new.svg)](https://ai.google.dev/)

`/`

- English
- Deutsch
- Español – América Latina
- Français
- Indonesia
- Italiano
- Polski
- Português – Brasil
- Shqip
- Tiếng Việt
- Türkçe
- Русский
- עברית
- العربيّة
- فارسی
- हिंदी
- বাংলা
- ภาษาไทย
- 中文 – 简体
- 中文 – 繁體
- 日本語
- 한국어

Sign in

Gemini 2.5 Flash Image (aka Nano Banana) is now available in the Gemini API! [Learn more](https://ai.google.dev/gemini-api/docs/image-generation#image_generation_text-to-image)

- [Home](https://ai.google.dev/)
- [Gemini API](https://ai.google.dev/gemini-api)
- [Gemini API docs](https://ai.google.dev/gemini-api/docs)



 Send feedback



# Prompt design strategies

_Prompt design_ is the process of creating prompts, or natural language requests,
that elicit accurate, high quality responses from a language model.

This page introduces basic concepts, strategies, and best practices to get you
started designing prompts to get the most out of Gemini AI models.

## Topic-specific prompt guides

Looking for more specific prompt strategies? Check out our other prompting guides
on:

- [Prompting with media files](https://ai.google.dev/gemini-api/docs/files#prompt-guide)
- Prompting for image generation with [Imagen](https://ai.google.dev/gemini-api/docs/imagen#imagen-prompt-guide) and [Gemini Native Image Generation](https://ai.google.dev/gemini-api/docs/image-generation#prompt-guide)
- [Prompting for video generation](https://ai.google.dev/gemini-api/docs/video#prompt-guide)

You can find other sample prompts in the [prompt gallery](https://ai.google.dev/gemini-api/prompts)
meant to interactively showcase many of the concepts shared in this guide.

## Clear and specific instructions

An effective and efficient way to customize model behavior is to provide it with
clear and specific instructions. Instructions can be in the form of a question,
step-by-step tasks, or as complex as mapping out a user's experience and mindset.

### Input

Input is the required text in the prompt that you want the model to provide a
response to. Inputs can be a question that the model
answers (question input), a task the model performs (task input), an entity the
model operates on (entity input), or partial input that the model completes or
continues (completion input).

| **Input type** | **Prompt** | **Generated output** |
| --- | --- | --- |
| Question | ```<br>    What's a good name for a flower shop that specializes in selling bouquets of<br>    dried flowers? Create a list of 5 options with just the names.<br>``` | ```<br>    Here are 10 names for a flower shop specializing in dried flowers:<br>    1. Everlasting Blooms<br>    2. Dried & Delightful<br>    3. The Petal Preserve<br>    4. Whispers of Wildflowers<br>    5. Forever Blooms<br>    <br>``` |
| Task | ```<br>    Give me a simple list of just the things that I must bring on a camping trip. The list should have 5 items.<br>``` | ```<br>    1. **Tent:** Your shelter from the elements.<br>    2. **Sleeping Bag:** Stay warm and comfortable.<br>    3. **Sleeping Pad:** Insulation and cushioning for a good night's sleep.<br>    4. **Headlamp or Flashlight:** Light for nighttime activities.<br>    5. **First Aid Kit:** Be prepared for minor injuries.<br>``` |
| Entity | ```<br>    Classify the following items as [large, small]:<br>Elephant<br>Mouse<br>Snail<br>``` | ```<br>Here's the classification:<br>* **Elephant:** Large<br>* **Mouse:** Small<br>* **Snail:** Small<br>    <br>``` |

#### Partial input completion

Generative language models work like an advanced auto completion tool. When you
provide partial content, the model can provide the rest of the content or what
it thinks is a continuation of that content as a response. When doing so, if you
include any examples or context, the model can take those examples or context
into account.

The following example provides a prompt with an instruction and an entity input:

|     |
| --- |
| **Prompt:**<br>```<br>For the given order, return a JSON object that has the fields cheeseburger, hamburger, fries, or<br>drink, with the value being the quantity.<br>Order: A burger and a drink.<br>  <br>```<br>**Response:**<br>```<br>{<br>  "cheeseburger": 0,<br>  "hamburger": 1,<br>  "fries": 0,<br>  "drink": 1<br>}<br>  <br>```<br>(gemini-2.5-flash) |

While the model did as prompted, writing out the instructions in natural language
can sometimes be challenging and it leaves a lot to the model's interpretation.
For example, a restaurants menu might contain many items. To reduce the size of
the JSON response, you probably want to omit the items that weren't ordered. In
this case, you can give an example and a [response prefix](https://ai.google.dev/gemini-api/docs/prompting-strategies#prefixes) and let
the model complete it:

|     |
| --- |
| **Prompt:**<br>````<br>Valid fields are cheeseburger, hamburger, fries, and drink.<br>Order: Give me a cheeseburger and fries<br>Output:<br>```<br>{<br>  "cheeseburger": 1,<br>  "fries": 1<br>}<br>```<br>Order: I want two burgers, a drink, and fries.<br>Output:<br>  <br>````<br>**Response:**<br>````<br>```<br>{<br>  "hamburger": 2,<br>  "drink": 1,<br>  "fries": 1<br>}<br>```<br>  <br>````<br>(gemini-2.5-flash) |

Notice how "cheeseburger" was excluded from the output because it wasn't a part
of the order.

### Constraints

Specify any constraints on reading the prompt or generating a response. You can
tell the model what to do and not to do. For example, you can specify a constraint
in the prompt on how long you want a summary to be:

|     |
| --- |
| **Prompt:**<br>```<br>Summarize this text in one sentence:<br>Text: A quantum computer exploits quantum mechanical phenomena to perform calculations exponentially<br>faster than any modern traditional computer. At very tiny scales, physical matter acts as both<br>particles and as waves, and quantum computing uses specialized hardware to leverage this behavior.<br>The operating principles of quantum devices is beyond the scope of classical physics. When deployed<br>at scale, quantum computers could be used in a wide variety of applications such as: in<br>cybersecurity to break existing encryption methods while helping researchers create new ones, in<br>meteorology to develop better weather forecasting etc. However, the current state of the art quantum<br>computers are still largely experimental and impractical.<br>    <br>```<br>**Response:**<br>```<br>      Exploiting quantum mechanical phenomena, quantum computers can perform calculations exponentially faster than traditional computers for potential applications like cybersecurity and meteorology, although they are currently largely experimental and impractical.<br>    <br>```<br>(gemini-2.5-flash) |

### Response format

You can give instructions that specify the format of the response. For example,
you can ask for the response to be formatted as a table, bulleted list, elevator
pitch, keywords, sentence, or paragraph. The following system instruction tells
the model to be more conversational in its response:

|     |
| --- |
| **System instruction**<br>```<br>    All questions should be answered comprehensively with details, unless the user requests a concise response specifically.<br>  <br>```<br>**Prompt**<br>```<br>    What is a smart way to make a business that sells DVD's in 2025?<br>  <br>```<br>**Response:**<br>```<br>Starting a business selling DVDs in 2025 presents significant challenges due to the overwhelming dominance of digital streaming and on-demand services; a "smart" approach would therefore require a highly specialized niche, a strong value proposition beyond just the disc, and likely a focus on community or collector markets rather than mainstream consumption.<br>Here's a breakdown of what a smart DVD business in 2025 would likely entail:<br>1. Extreme Niche Specialization: You cannot compete with streaming libraries. Your business must focus on what digital doesn't offer easily or at all. This could include:<br>    * Out-of-Print & Rare Titles: Sourcing films or TV shows that have never been released digitally or are currently unavailable on major streaming platforms.<br>    ....<br>  <br>```<br>(gemini-2.5-flash) |

#### Format responses with the completion strategy

The [completion strategy](https://ai.google.dev/gemini-api/docs/prompting-strategies#completion) can also help format the response.
The following example prompts the model to create an essay outline:

|     |
| --- |
| **Prompt:**<br>```<br>Create an outline for an essay about hummingbirds.<br>  <br>```<br>**Response:**<br>```<br>Here is a possible outline for an essay about hummingbirds:<br>I. Introduction<br>A. Hook: Start with a captivating fact or description about hummingbirds (e.g., their speed, iridescent colors, or tiny size).<br>B. Background: Briefly introduce hummingbirds – where they are found (Americas), their reputation as unique birds.<br>C. Thesis Statement: State the main point of the essay, which could be about the remarkable adaptations, behaviors, and ecological importance of hummingbirds.<br>II. Appearance and Identification<br>.....<br>  <br>```<br>(gemini-2.5-flash) |

The prompt didn't specify the format for the outline and the model chose a format
for you. To get the model to return an outline in a specific format, you can add
text that represents the start of the outline and let the model complete it based
on the pattern that you initiated.

|     |
| --- |
| **Prompt:**<br>```<br>Create an outline for an essay about hummingbirds.<br>I. Introduction<br>   *<br>  <br>```<br>**Response:**<br>```<br>Okay, here is an outline for an essay about hummingbirds, starting from the introduction you provided:<br>I. Introduction<br>* Hook: Start with a captivating fact or description about hummingbirds (e.g., their speed, iridescent colors, or tiny size).<br>* Background: Briefly introduce hummingbirds – where they are found (Americas), their reputation as unique birds, and their general characteristics.<br>* Thesis Statement: State the main point of the essay, focusing on the remarkable adaptations, behaviors, and ecological significance that make hummingbirds extraordinary.<br>.....<br>  <br>```<br>(gemini-2.5-flash) |

## Zero-shot vs few-shot prompts

You can include examples in the prompt that show the model what getting it right
looks like. The model attempts to identify patterns and relationships from the
examples and applies them when generating a response. Prompts that contain a few
examples are called _few-shot_ prompts, while prompts that provide no
examples are called _zero-shot_ prompts. Few-shot prompts are often used
to regulate the formatting, phrasing, scoping, or general patterning of model
responses. Use specific and varied examples to help the model narrow its focus
and generate more accurate results.

We recommend to always include few-shot examples in your prompts. Prompts without
few-shot examples are likely to be less effective. In fact, you can remove
instructions from your prompt if your examples are clear enough in showing the
task at hand.

The following zero-shot prompt asks the model to choose the best explanation.

|     |
| --- |
| **Prompt:**<br>```<br>Please choose the best explanation to the question:<br>Question: How is snow formed?<br>Explanation1: Snow is formed when water vapor in the air freezes into ice<br>crystals in the atmosphere, which can combine and grow into snowflakes as they<br>fall through the atmosphere and accumulate on the ground.<br>Explanation2: Water vapor freezes into ice crystals forming snow.<br>Answer:<br>  <br>```<br>**Response:**<br>```<br>Explanation1 is the better explanation because it provides more detail on the<br>process, including how ice crystals combine and grow into snowflakes as they<br>fall through the atmosphere.<br>  <br>```<br>(gemini-2.5-flash) |

If your use case requires the model to produce concise responses, you can include
examples in the prompt that give preference to concise responses.

The following prompt provides two examples that show preference to the shorter
explanations. In the response, you can see that the examples guided the model to
choose the shorter explanation ( `Explanation2`) as opposed to the longer
explanation ( `Explanation1`) like it did previously.

|     |
| --- |
| **Prompt:**<br>```<br>Below are some examples showing a question, explanation, and answer format:<br>Question: Why is the sky blue?<br>Explanation1: The sky appears blue because of Rayleigh scattering, which causes<br>shorter blue wavelengths of light to be scattered more easily than longer red<br>wavelengths, making the sky look blue.<br>Explanation2: Due to Rayleigh scattering effect.<br>Answer: Explanation2<br>Question: What is the cause of earthquakes?<br>Explanation1: Sudden release of energy in the Earth's crust.<br>Explanation2: Earthquakes happen when tectonic plates suddenly slip or break<br>apart, causing a release of energy that creates seismic waves that can shake the<br>ground and cause damage.<br>Answer: Explanation1<br>Now, Answer the following question given the example formats above:<br>Question: How is snow formed?<br>Explanation1: Snow is formed when water vapor in the air freezes into ice<br>crystals in the atmosphere, which can combine and grow into snowflakes as they<br>fall through the atmosphere and accumulate on the ground.<br>Explanation2: Water vapor freezes into ice crystals forming snow.<br>Answer:<br>  <br>```<br>**Response:**<br>```<br>Answer: Explanation2<br>  <br>```<br>(gemini-2.5-flash) |

### Optimal number of examples

Models like Gemini can often pick up on patterns using a few examples, though
you may need to experiment with the number of examples to provide in the prompt
for the best results. At the same time, if you include too many examples,
the model may start to [overfit](https://developers.google.com/machine-learning/glossary#overfitting)
the response to the examples.

### Patterns vs anti patterns

Using examples to show the model a pattern to follow is more effective than using
examples to show the model an anti pattern to avoid.

⛔ **Negative pattern:**

|     |
| --- |
| **Example**<br>```<br>Don't end haikus with a question:<br>Haiku are fun<br>A short and simple poem<br>Don't you enjoy them?<br>  <br>``` |

✅ **Positive pattern:**

|     |
| --- |
| **Example**<br>```<br>Always end haikus with an assertion:<br>Haiku are fun<br>A short and simple poem<br>A joy to write<br>  <br>``` |

### Consistent formatting

Make sure that the structure and formatting of few-shot examples are the same to
avoid responses with undesired formats. One of the primary objectives of adding
few-shot examples in prompts is to show the model the response format. Therefore,
it is essential to ensure a consistent format across all examples, especially
paying attention to XML tags, white spaces, newlines, and example splitters.

## Add context

You can include instructions and information in a prompt that the model needs
to solve a problem, instead of assuming that the model has all of the required
information. This contextual information helps the model understand the constraints
and details of what you're asking for it to do.

The following example asks the model to give troubleshooting guidance for a router:

|     |
| --- |
| **Prompt:**<br>```<br>What should I do to fix my disconnected wifi? The light on my Google<br>Wifi router is yellow and blinking slowly.<br>  <br>```<br>**Response:**<br>```<br>  A yellow blinking light on your Google Wifi router usually indicates a problem<br>  with the internet connection. Here are some steps to troubleshoot and fix the<br>  issue:<br>  1. Restart your router and modem:<br>    - Unplug your modem from the power outlet and wait for 30 seconds.<br>    - Plug your modem back in and wait for it to fully boot up.<br>    - Unplug your Google Wifi router and wait for 30 seconds.<br>    - Plug your Google Wifi router back in and wait for it to fully boot up.<br>.....<br>  <br>```<br>(gemini-2.5-flash) |

The response looks like generic troubleshooting information that's not specific
to the router or the status of the LED indicator lights.

To customize the response for the specific router, you can add to the prompt the router's
troubleshooting guide as context for it to refer to when providing a response.

|     |
| --- |
| **Prompt:**<br>```<br>Answer the question using the text below. Respond with only the text provided.<br>Question: What should I do to fix my disconnected wifi? The light on my Google Wifi router is yellow and blinking slowly.<br>Text:<br>Color: Slowly pulsing yellow<br>What it means: There is a network error.<br>What to do:<br>Check that the Ethernet cable is connected to both your router and your modem and both devices are turned on. You might need to unplug and plug in each device again.<br>Color: Fast blinking yellow<br>What it means: You are holding down the reset button and are factory resetting this device.<br>What to do:<br>If you keep holding down the reset button, after about 12 seconds, the light will turn solid yellow. Once it is solid yellow, let go of the factory reset button.<br>Color: Solid yellow<br>What it means: Router is factory resetting.<br>What to do:<br>This can take up to 10 minutes. When it's done, the device will reset itself and start pulsing white, letting you know it's ready for setup.<br>Color: Solid red<br>What it means: Something is wrong.<br>What to do:<br>Critical failure. Factory reset the router. If the light stays red, contact Wifi customer support.<br>  <br>```<br>**Response:**<br>```<br>Check that the Ethernet cable is connected to both your router and your modem and both devices are turned on. You might need to unplug and plug in each device again.<br>  <br>```<br>(gemini-2.5-flash) |

## Add prefixes

A prefix is a word or phrase that you add to the prompt content that can serve
several purposes, depending on where you put the prefix:

- **Input prefix:** Adding a prefix to the input signals semantically meaningful
parts of the input to the model. For example, the prefixes "English:" and
"French:" demarcate two different languages.
- **Output prefix:** Even though the output is generated by the model, you can
add a prefix for the output in the prompt. The output prefix gives the model
information about what's expected as a response. For example, the output
prefix "JSON:" signals to the model that the output should be in JSON format.
- **Example prefix:** In few-shot prompts, adding prefixes to the examples
provides labels that the model can use when generating the output, which makes
it easier to parse output content.

In the following example, "Text:" is the input prefix and "The answer is:" is the
output prefix.

|     |
| --- |
| **Prompt:**<br>```<br>Classify the text as one of the following categories.<br>- large<br>- small<br>Text: Rhino<br>The answer is: large<br>Text: Mouse<br>The answer is: small<br>Text: Snail<br>The answer is: small<br>Text: Elephant<br>The answer is:<br>  <br>```<br>**Response:**<br>```<br>The answer is: large<br>  <br>```<br>(gemini-2.5-flash) |

## Break down prompts into components

For use cases that require complex prompts, you can help the model manage this
complexity by breaking things down into simpler components.

1. **Break down instructions:** Instead of having many instructions in one
prompt, create one prompt per instruction. You can choose which prompt to
process based on the user's input.

2. **Chain prompts:** For complex tasks that involve multiple sequential steps,
make each step a prompt and chain the prompts together in a sequence. In this
sequential chain of prompts, the output of one prompt in the sequence becomes
the input of the next prompt. The output of the last prompt in the sequence
is the final output.

3. **Aggregate responses:** Aggregation is when you want to perform different
parallel tasks on different portions of the data and aggregate the results to
produce the final output. For example, you can tell the model to perform one
operation on the first part of the data, perform another operation on the rest
of the data and aggregate the results.


## Experiment with model parameters

Each call that you send to a model includes parameter values that control how
the model generates a response. The model can generate different results for
different parameter values. Experiment with different parameter values to get
the best values for the task. The parameters available for
different models may differ. The most common parameters are the following:

1. **Max output tokens:** Specifies the maximum number of tokens that can be
generated in the response. A token is approximately four characters. 100
tokens correspond to roughly 60-80 words.

2. **Temperature:** The temperature controls the degree of randomness in token
selection. The temperature is used for sampling during response generation,
which occurs when `topP` and `topK` are applied. Lower temperatures are good
for prompts that require a more deterministic or less open-ended response,
while higher temperatures can lead to more diverse or creative results. A
temperature of 0 is deterministic, meaning that the highest probability
response is always selected.

3. **`topK`:** The `topK` parameter changes how the model selects tokens for
output. A `topK` of 1 means the selected token is the most probable among
all the tokens in the model's vocabulary (also called greedy decoding),
while a `topK` of 3 means that the next token is selected from among the 3
most probable using the temperature. For each token selection step, the
`topK` tokens with the highest probabilities are sampled. Tokens are then
further filtered based on `topP` with the final token selected using
temperature sampling.

4. **`topP`:** The `topP` parameter changes how the model selects tokens for
output. Tokens are selected from the most to least probable until the sum of
their probabilities equals the `topP` value. For example, if tokens A, B,
and C have a probability of 0.3, 0.2, and 0.1 and the `topP` value is 0.5,
then the model will select either A or B as the next token by using the
temperature and exclude C as a candidate. The default `topP` value is 0.95.

5. **`stop_sequences`:** Set a stop sequence to
tell the model to stop generating content. A stop sequence can be any
sequence of characters. Try to avoid using a sequence of characters that
may appear in the generated content.


## Prompt iteration strategies

Prompt design can sometimes require a few iterations before
you consistently get the response you're looking for. This section provides
guidance on some things you can try when iterating on your prompts:

1. **Use different phrasing:** Using different words or phrasing in your prompts
often yields different responses from the model even though they all mean the
same thing. If you're not getting the expected results from your prompt, try
rephrasing it.


|     |
| --- |
| ```<br>Version 1:<br>How do I bake a pie?<br>Version 2:<br>Suggest a recipe for a pie.<br>Version 3:<br>What's a good pie recipe?<br>  <br>``` |

2. **Switch to an analogous task:** If you can't get the model to follow your
instructions for a task, try giving it instructions for an analogous task
that achieves the same result.

This prompt tells the model to categorize a book by using predefined categories:


|     |
| --- |
| **Prompt:**<br>```<br>Which category does The Odyssey belong to:<br>thriller<br>sci-fi<br>mythology<br>biography<br>  <br>```<br>**Response:**<br>```<br>    The Odyssey belongs to the category of **mythology**. <br>    Here's why:<br>    * **Mythology:** The Odyssey tells the story of Odysseus, a hero from Greek mythology, and his<br>    journey home after the Trojan War. It features gods, monsters, and supernatural events common to<br>    Greek mythology.<br>.....<br>  <br>```<br>(gemini-2.5-flash) |


The response is correct, but the model didn't stay within the bounds of the
options. You also want to model to just respond with one of the options instead
of in a full sentence. In this case, you can rephrase the instructions as a
multiple choice question and ask the model to choose an option.




|     |
| --- |
| **Prompt:**<br>```<br>Multiple choice problem: Which of the following options describes the book The Odyssey?<br>Options:<br>thriller<br>sci-fi<br>mythology<br>biography<br>```<br>**Response:**<br>```<br>The correct answer is mythology. <br>```<br>(gemini-2.5-flash) |

3. **Change the order of prompt content:** The order of the content in the prompt
can sometimes affect the response. Try changing the content order and see
how that affects the response.




```
Version 1:
[examples]
[context]
[input]

Version 2:
[input]
[examples]
[context]

Version 3:
[examples]
[input]
[context]

```


## Fallback responses

A fallback response is a response returned by the model when either the prompt
or the response triggers a safety filter. An example of a fallback response is
"I'm not able to help with that, as I'm only a language model."

If the model responds with a fallback response, try increasing the temperature.

## Things to avoid

- Avoid relying on models to generate factual information.
- Use with care on math and logic problems.

## Generative models under the hood

This section aims to answer the question - **_Is there randomness in generative_**
**_models' responses, or are they deterministic?_**

The short answer - yes to both. When you prompt a generative model, a text
response is generated in two stages. In the first stage, the generative model
processes the input prompt and generates a **probability distribution** over
possible tokens (words) that are likely to come next. For example, if you prompt
with the input text "The dog jumped over the ... ", the generative model will
produce an array of probable next words:

```
[("fence", 0.77), ("ledge", 0.12), ("blanket", 0.03), ...]

```

This process is deterministic; a generative model will produce this same
distribution every time it's input the same prompt text.

In the second stage, the generative model converts these distributions into
actual text responses through one of several decoding strategies. A simple
decoding strategy might select the most likely token at every timestep. This
process would always be deterministic. However, you could instead choose to
generate a response by _randomly sampling_ over the distribution returned by the
model. This process would be stochastic (random). Control the degree of
randomness allowed in this decoding process by setting the temperature. A
temperature of 0 means only the most likely tokens are selected, and there's no
randomness. Conversely, a high temperature injects a high degree of randomness
into the tokens selected by the model, leading to more unexpected, surprising
model responses.

## Next steps

- Now that you have a deeper understanding of prompt design, try writing your
own prompts using [Google AI Studio](http://aistudio.google.com/).
- To learn about multimodal prompting, see
[Prompting with media files](https://ai.google.dev/gemini-api/docs/files#prompt-guide).
- To learn about image prompting, see the [Imagen prompt guide](https://ai.google.dev/gemini-api/docs/image-generation#imagen-prompt-guide)
- To learn about video prompting, see the [Veo prompt guide](https://ai.google.dev/gemini-api/docs/video#prompt-guide)



 Send feedback



Except as otherwise noted, the content of this page is licensed under the [Creative Commons Attribution 4.0 License](https://creativecommons.org/licenses/by/4.0/), and code samples are licensed under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0). For details, see the [Google Developers Site Policies](https://developers.google.com/site-policies). Java is a registered trademark of Oracle and/or its affiliates.

Last updated 2025-08-26 UTC.


Need to tell us more?






\[\[\["Easy to understand","easyToUnderstand","thumb-up"\],\["Solved my problem","solvedMyProblem","thumb-up"\],\["Other","otherUp","thumb-up"\]\],\[\["Missing the information I need","missingTheInformationINeed","thumb-down"\],\["Too complicated / too many steps","tooComplicatedTooManySteps","thumb-down"\],\["Out of date","outOfDate","thumb-down"\],\["Samples / code issue","samplesCodeIssue","thumb-down"\],\["Other","otherDown","thumb-down"\]\],\["Last updated 2025-08-26 UTC."\],\[\],\[\],null,\[\]\]