import Groq from 'groq-sdk';

interface ChatRequest { message: string; currentCode?: string; language: string; history?: Array<{ role: string; content: string }>; }

// Initialize Groq client lazily to ensure env vars are loaded
let groqClient: Groq | null = null;
let groqInitialized = false;

function initializeGroq(): void {
  if (groqInitialized) return;
  
  groqInitialized = true;
  
  try {
    const apiKey = process.env.GROQ_API_KEY;
    
    if (apiKey && apiKey.startsWith('gsk_')) {
      groqClient = new Groq({ apiKey });
      console.log('✅ Groq AI ready with key:', apiKey.substring(0, 10) + '...');
      console.log('📊 Model:', process.env.GROQ_MODEL || 'llama-3.1-70b-versatile');
    } else {
      console.warn('⚠️ GROQ_API_KEY missing or invalid (fallback mode)');
      console.warn('   Expected format: gsk_...');
      console.warn('   Current value:', apiKey ? apiKey.substring(0, 10) + '...' : 'undefined');
    }
  } catch (e) {
    console.error('❌ Groq init failed:', e);
    groqClient = null;
  }
}

export async function getSimpleChatResponse(req: ChatRequest): Promise<string> {
  const { message, language, currentCode, history } = req;
  
  console.log('🔍 getSimpleChatResponse called');
  console.log('🔑 GROQ_API_KEY exists:', !!process.env.GROQ_API_KEY);
  console.log('🔑 Key starts with gsk_:', process.env.GROQ_API_KEY?.startsWith('gsk_'));
  
  // Initialize Groq on first use
  initializeGroq();
  
  console.log('🤖 groqClient initialized:', !!groqClient);
  
  if (groqClient) {
    try {
      const systemPrompt = `You are an advanced AI coding assistant - smart, friendly, and helpful like ChatGPT.

🎯 Core Capabilities:
- Understand ANY question or request in Arabic or English
- Detect the user's language automatically and respond in the same language
- Have natural, conversational interactions
- Remember context from previous messages in the conversation
- Explain concepts in simple, clear terms
- Be creative and helpful with ANY coding-related question

💬 Communication Style:
- Be friendly and encouraging
- Use emojis when appropriate to make responses engaging
- Break down complex topics into simple steps
- Ask clarifying questions if the request is unclear
- Provide examples when explaining concepts

🔧 Technical Skills:
- Write clean, well-commented code in: Python, Java, JavaScript, C++
- Debug and fix code errors
- Explain code line by line
- Suggest optimizations and best practices
- Help with algorithms, data structures, and problem-solving
- Answer theoretical programming questions
- Help with homework and projects (guide, don't just give answers)

📚 Topics You Can Help With:
- Programming basics and syntax
- Algorithms and logic
- Data structures
- Object-oriented programming
- Web development
- Problem-solving strategies
- Code review and improvements
- Error debugging
- Project ideas and guidance
- Study tips and learning resources

🌟 Special Instructions:
- If user asks in Arabic, respond completely in Arabic
- If user asks in English, respond completely in English
- Mix languages only if the user does
- Be patient with beginners
- Celebrate progress and encourage learning
- Format code with \`\`\` and language name
- Use bullet points and formatting for clarity

Current context: User is working with ${language}. They may have code in their editor.`;


      const messages: any[] = [{ role: 'system', content: systemPrompt }];
      
      // Add more conversation history for better context (last 6 messages)
      (history || []).slice(-6).forEach(h => {
        messages.push({
          role: h.role === 'user' ? 'user' : 'assistant',
          content: h.content
        });
      });
      
      // Build user message with code context
      let userMsg = message;
      
      // Always include code context if available and message seems code-related
      if (currentCode && currentCode.trim()) {
        const hasCodeKeywords = /شرح|اشرح|explain|review|analyze|fix|bug|error|optimize|improve|كود|code|هذا|this|ليش|why|كيف|how|what|ايش|شو/i.test(message);
        const isShortMessage = message.length < 100; // Short messages likely refer to visible code
        
        if (hasCodeKeywords || isShortMessage) {
          userMsg += `\n\n[Code currently in editor]:\n\`\`\`${language}\n${currentCode.slice(0, 1200)}\n\`\`\``;
        }
      }
      
      messages.push({ role: 'user', content: userMsg });
      
      const completion = await groqClient.chat.completions.create({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile', // Latest and best model
        messages,
        max_tokens: 2000, // More tokens for detailed responses
        temperature: 0.7, // Balanced creativity
      });
      
      const response = completion.choices[0]?.message?.content?.trim();
      if (response) {
        console.log('✅ Groq AI response generated');
        return response;
      }
    } catch (err: any) {
      console.error('❌ Groq API error:', err.message || err);
      if (err.message?.includes('rate_limit')) {
        return 'عذراً، تم تجاوز حد الاستخدام. يرجى المحاولة بعد قليل.\n\nSorry, rate limit exceeded. Please try again in a moment.';
      }
    }
  } else {
    console.warn('⚠️ Groq API not configured, using fallback responses');
  }
  
  return fallback(message, language, currentCode);
}

function fallback(message: string, language: string, currentCode?: string): string {
  const m = message.toLowerCase();
  const isArabic = /[\u0600-\u06FF]/.test(message);
  
  // Greetings
  if (/^(hi|hello|hey|مرحبا|مرحباً|السلام|أهلا)$/i.test(m)) {
    return isArabic 
      ? `مرحباً! 👋 أنا مساعدك في البرمجة.\n\nيمكنني مساعدتك في:\n• شرح الكود\n• كتابة كود جديد\n• إيجاد الأخطاء وإصلاحها\n• تحسين الكود\n\nكيف يمكنني مساعدتك؟`
      : `Hello! 👋 I'm your coding assistant.\n\nI can help you with:\n• Explaining code\n• Writing new code\n• Finding and fixing bugs\n• Optimizing code\n\nHow can I help you today?`;
  }
  
  // Code explanation request
  if (/شرح|اشرح|explain|what.*does/i.test(m)) {
    if (currentCode && currentCode.trim()) {
      return isArabic
        ? `سأشرح لك الكود:\n\nهذا الكود مكتوب بلغة ${language}. يبدو أنه ${analyzeCodePurpose(currentCode, language)}.\n\nللحصول على شرح أكثر تفصيلاً، يرجى تفعيل Groq API في ملف .env`
        : `Let me explain this code:\n\nThis ${language} code appears to ${analyzeCodePurpose(currentCode, language)}.\n\nFor more detailed explanations, please configure Groq API in .env file`;
    }
    return isArabic
      ? 'الصق الكود الذي تريد شرحه، ثم اطلب مني شرحه.'
      : 'Please paste the code you want me to explain, then ask me to explain it.';
  }
  
  // Bug finding
  if (/bug|error|fix|مشكلة|خطأ|صلح/.test(m)) {
    return isArabic
      ? 'الصق الكود والخطأ الذي تواجهه، وسأساعدك في إصلاحه.\n\nملاحظة: للحصول على تحليل أفضل، قم بتفعيل Groq API.'
      : 'Paste your code and the error you\'re facing, and I\'ll help you fix it.\n\nNote: For better analysis, configure Groq API.';
  }
  
  // Code generation
  const sum = /يقرأ\s*رقمين|read\s+two\s+numbers|sum\s+two\s+numbers|جمع\s*رقمين/.test(m);
  if (/بدي كود|code|write|generate|اكتب|اعمل/.test(m) || sum) {
    return generateSampleCode(language, sum, isArabic);
  }
  
  // Default response
  return isArabic
    ? `يمكنني مساعدتك في:\n• شرح الكود - اكتب: "اشرح هذا الكود"\n• كتابة كود - اكتب: "بدي كود ${language}"\n• إصلاح الأخطاء - اكتب: "في عندي مشكلة"\n\n💡 نصيحة: للحصول على إجابات أفضل، قم بتفعيل Groq API في ملف .env`
    : `I can help you with:\n• Explain code - say: "explain this code"\n• Write code - say: "write ${language} code"\n• Fix bugs - say: "I have an error"\n\n💡 Tip: For better responses, configure Groq API in .env file`;
}

function analyzeCodePurpose(code: string, language: string): string {
  const c = code.toLowerCase();
  if (c.includes('print') || c.includes('console.log') || c.includes('system.out')) return 'prints output to console';
  if (c.includes('input') || c.includes('scanner') || c.includes('readline')) return 'reads user input';
  if (c.includes('for') || c.includes('while')) return 'uses loops for iteration';
  if (c.includes('if') || c.includes('else')) return 'uses conditional statements';
  if (c.includes('function') || c.includes('def ') || c.includes('void ')) return 'defines a function';
  if (c.includes('class ')) return 'defines a class';
  return 'performs some operations';
}

function generateSampleCode(language: string, isSum: boolean, isArabic: boolean): string {
  const intro = isArabic ? 'إليك مثال على كود' : 'Here\'s a sample code in';
  
  switch (language) {
    case 'python':
      return isSum
        ? `${intro} Python ${isArabic ? 'لجمع رقمين' : 'to sum two numbers'}:\n\n\`\`\`python\n# ${isArabic ? 'قراءة رقمين من المستخدم' : 'Read two numbers from user'}\na = int(input("${isArabic ? 'أدخل الرقم الأول' : 'Enter first number'}: "))\nb = int(input("${isArabic ? 'أدخل الرقم الثاني' : 'Enter second number'}: "))\n\n# ${isArabic ? 'حساب المجموع' : 'Calculate sum'}\nsum = a + b\n\n# ${isArabic ? 'طباعة النتيجة' : 'Print result'}\nprint(f"${isArabic ? 'المجموع' : 'Sum'}: {sum}")\n\`\`\``
        : `${intro} Python:\n\n\`\`\`python\n# ${isArabic ? 'برنامج بسيط' : 'Simple program'}\nname = input("${isArabic ? 'ما اسمك؟' : 'What is your name?'} ")\nprint(f"${isArabic ? 'مرحباً' : 'Hello'}, {name}!")\n\`\`\``;
    
    case 'java':
      return isSum
        ? `${intro} Java ${isArabic ? 'لجمع رقمين' : 'to sum two numbers'}:\n\n\`\`\`java\nimport java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        \n        // ${isArabic ? 'قراءة رقمين' : 'Read two numbers'}\n        System.out.print("${isArabic ? 'أدخل الرقم الأول' : 'Enter first number'}: ");\n        int a = scanner.nextInt();\n        \n        System.out.print("${isArabic ? 'أدخل الرقم الثاني' : 'Enter second number'}: ");\n        int b = scanner.nextInt();\n        \n        // ${isArabic ? 'حساب وطباعة المجموع' : 'Calculate and print sum'}\n        int sum = a + b;\n        System.out.println("${isArabic ? 'المجموع' : 'Sum'}: " + sum);\n    }\n}\n\`\`\``
        : `${intro} Java:\n\n\`\`\`java\npublic class Main {\n    public static void main(String[] args) {\n        // ${isArabic ? 'طباعة رسالة' : 'Print message'}\n        System.out.println("${isArabic ? 'مرحباً بك في Java!' : 'Welcome to Java!'}");\n    }\n}\n\`\`\``;
    
    case 'javascript':
      return isSum
        ? `${intro} JavaScript ${isArabic ? 'لجمع رقمين' : 'to sum two numbers'}:\n\n\`\`\`javascript\n// ${isArabic ? 'قراءة رقمين من المستخدم' : 'Read two numbers from user'}\nconst a = parseInt(prompt('${isArabic ? 'أدخل الرقم الأول' : 'Enter first number'}'));\nconst b = parseInt(prompt('${isArabic ? 'أدخل الرقم الثاني' : 'Enter second number'}'));\n\n// ${isArabic ? 'حساب المجموع' : 'Calculate sum'}\nconst sum = a + b;\n\n// ${isArabic ? 'عرض النتيجة' : 'Display result'}\nalert('${isArabic ? 'المجموع' : 'Sum'}: ' + sum);\n\`\`\``
        : `${intro} JavaScript:\n\n\`\`\`javascript\n// ${isArabic ? 'برنامج بسيط' : 'Simple program'}\nconst name = prompt('${isArabic ? 'ما اسمك؟' : 'What is your name?'}');\nconsole.log('${isArabic ? 'مرحباً' : 'Hello'}, ' + name + '!');\n\`\`\``;
    
    case 'cpp':
      return isSum
        ? `${intro} C++ ${isArabic ? 'لجمع رقمين' : 'to sum two numbers'}:\n\n\`\`\`cpp\n#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    \n    // ${isArabic ? 'قراءة رقمين' : 'Read two numbers'}\n    cout << "${isArabic ? 'أدخل الرقم الأول' : 'Enter first number'}: ";\n    cin >> a;\n    \n    cout << "${isArabic ? 'أدخل الرقم الثاني' : 'Enter second number'}: ";\n    cin >> b;\n    \n    // ${isArabic ? 'حساب وطباعة المجموع' : 'Calculate and print sum'}\n    int sum = a + b;\n    cout << "${isArabic ? 'المجموع' : 'Sum'}: " << sum << endl;\n    \n    return 0;\n}\n\`\`\``
        : `${intro} C++:\n\n\`\`\`cpp\n#include <iostream>\nusing namespace std;\n\nint main() {\n    // ${isArabic ? 'طباعة رسالة' : 'Print message'}\n    cout << "${isArabic ? 'مرحباً بك في C++!' : 'Welcome to C++!'}" << endl;\n    return 0;\n}\n\`\`\``;
    
    default:
      return isArabic
        ? `اللغة ${language} غير مدعومة حالياً. اللغات المدعومة: Python, Java, JavaScript, C++`
        : `Language ${language} is not supported yet. Supported: Python, Java, JavaScript, C++`;
  }
}
