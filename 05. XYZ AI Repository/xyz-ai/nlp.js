// Local Natural Language Processing engine supporting 11 languages.
// Acts as a fallback when GEMINI_API_KEY is not set or when local mock mode is preferred.

const db = require('./db');

const TRANSLATIONS = {
  english: {
    greet: "Hello! I am XYZ AI, your school assistant. How can I help you today?",
    help: "I can help you view attendance, mark student attendance, or request an escalation to talk to a teacher or school management. What would you like to do?",
    unauthorized: "Access Denied: You do not have permission to perform this action.",
    prompt_injection: "Warning: Input violates safety parameters. Request blocked.",
    student_attendance: "Your attendance is currently {percentage}%. You have {absents} absences registered.",
    parent_attendance: "Your child {child} has {percentage}% attendance. Would you like me to check the recent attendance records?",
    teacher_attendance: "Student {name} currently has {percentage}% attendance with {absents} absences.",
    overall_attendance: "The school's overall attendance rate is {percentage}%. The highest attendance is in Class 10-B.",
    mark_success: "Attendance marked successfully! {name} has been marked {status} for {date}.",
    escalate_offer: "I understand. I can connect you with the teacher or school management. Would you like me to request a call now?",
    escalate_success: "Your call request has been submitted successfully to the {target}. A representative will contact you soon.",
    unrecognized: "I'm sorry, I didn't quite catch that. Could you please rephrase, or would you like me to connect you with a teacher?"
  },
  hindi: {
    greet: "नमस्ते! मैं XYZ AI, आपका स्कूल सहायक हूँ। आज मैं आपकी क्या मदद कर सकता हूँ?",
    help: "मैं आपको उपस्थिति देखने, छात्रों की उपस्थिति दर्ज करने, या शिक्षक/प्रबंधन से संपर्क करने में मदद कर सकता हूँ। आप क्या करना चाहेंगे?",
    unauthorized: "पहुंच अस्वीकृत: आपको इस क्रिया को करने की अनुमति नहीं है।",
    prompt_injection: "चेतावनी: इनपुट सुरक्षा मापदंडों का उल्लंघन करता है।",
    student_attendance: "आपकी उपस्थिति वर्तमान में {percentage}% है। आपके {absents} अनुपस्थिति दर्ज हैं।",
    parent_attendance: "आपके बच्चे {child} की उपस्थिति {percentage}% है। क्या आप चाहते हैं कि मैं हालिया रिकॉर्ड देखूँ?",
    teacher_attendance: "छात्र {name} की उपस्थिति {percentage}% है जिसमें {absents} अनुपस्थिति शामिल हैं।",
    overall_attendance: "स्कूल की कुल उपस्थिति दर {percentage}% है। सबसे अधिक उपस्थिति कक्षा 10-B में है।",
    mark_success: "उपस्थिति सफलतापूर्वक दर्ज की गई! {name} को {date} के लिए {status} चिह्नित किया गया है।",
    escalate_offer: "मैं समझ सकता हूँ। मैं आपको शिक्षक या स्कूल प्रबंधन से जोड़ सकता हूँ। क्या आप अभी कॉल का अनुरोध करना चाहते हैं?",
    escalate_success: "आपका कॉल अनुरोध {target} को सफलतापूर्वक भेज दिया गया है। जल्द ही आपसे संपर्क किया जाएगा।",
    unrecognized: "मुझे क्षमा करें, मैं समझ नहीं पाया। क्या आप कृपया अपनी बात दोहरा सकते हैं, या क्या आप चाहते हैं कि मैं आपको शिक्षक से जोड़ूँ?"
  },
  tamil: {
    greet: "வணக்கம்! நான் XYZ AI, உங்கள் பள்ளி உதவியாளர். இன்று நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?",
    help: "வருகைப் பதிவைப் பார்க்க, வருகையைக் குறிக்க அல்லது ஆசிரியர்/மேலாண்மையைத் தொடர்பு கொள்ள நான் உதவ முடியும். நீங்கள் என்ன செய்ய விரும்புகிறீர்கள்?",
    unauthorized: "அனுமதி மறுக்கப்பட்டது: இந்தச் செயலைச் செய்ய உங்களுக்கு அனுமதி இல்லை.",
    prompt_injection: "எச்சரிக்கை: பாதுகாப்பு அளவுருக்கள் மீறப்பட்டுள்ளன.",
    student_attendance: "உங்கள் வருகை தற்போது {percentage}% ஆகும். {absents} நாட்கள் நீங்கள் வரவில்லை.",
    parent_attendance: "உங்கள் குழந்தை {child} இன் வருகைப்பதிவு {percentage}% ஆகும். சமீபத்திய வருகைப் பதிவைச் சரிபார்க்க வேண்டுமா?",
    teacher_attendance: "மாணவர் {name} இன் வருகை {percentage}% ஆகும், {absents} நாட்கள் வரவில்லை.",
    overall_attendance: "பள்ளியின் ஒட்டுமொத்த வருகை விகிதம் {percentage}% ஆகும். 10-B வகுப்பில் அதிக வருகை உள்ளது.",
    mark_success: "வருகைப்பதிவு வெற்றிகரமாக குறிக்கப்பட்டது! {name} {date} அன்று {status} என குறிக்கப்பட்டுள்ளார்.",
    escalate_offer: "எனக்குப் புரிகிறது. நான் உங்களை ஆசிரியர் அல்லது பள்ளி நிர்வாகத்துடன் இணைக்க முடியும். இப்போது அழைப்பை கோர விரும்புகிறீர்களா?",
    escalate_success: "உங்கள் அழைப்புக் கோரிக்கை {target} இடம் வெற்றிகரமாக சமர்ப்பிக்கப்பட்டது. விரைவில் உங்களைத் தொடர்புகொள்வார்கள்.",
    unrecognized: "மன்னிக்கவும், எனக்குப் புரியவில்லை. தயவுசெய்து மீண்டும் கூற முடியுமா அல்லது ஆசிரியருடன் இணைக்க வேண்டுமா?"
  },
  telugu: {
    greet: "నమస్కారం! నేను XYZ AI, మీ పాఠశాల సహాయకుడిని. ఈరోజు మీకు ఎలా సహాయపడగలను?",
    help: "నేను మీకు హాజరు చూడటంలో, హాజరు నమోదు చేయడంలో లేదా ఉపాధ్యాయులు/యాజమాన్యంతో మాట్లాడటానికి సహాయపడగలను. మీరు ఏమి చేయాలనుకుంటున్నారు?",
    unauthorized: "అనుమతి నిరాకరించబడింది: ఈ చర్యను చేయడానికి మీకు అనుమతి లేదు.",
    prompt_injection: "హెచ్చరిక: ఇన్‌పుట్ భద్రతా నిబంధనలను ఉల్లంఘిస్తోంది.",
    student_attendance: "ప్రస్తుతం మీ హాజరు శాతం {percentage}%. మీకు {absents} రోజులు సెలవులు ఉన్నాయి.",
    parent_attendance: "మీ child {child} హాజరు శాతం {percentage}%. ఇటీవలి హాజరు రికార్డులను చూడమంటారా?",
    teacher_attendance: "విద్యార్థి {name} హాజరు శాతం {percentage}%, {absents} రోజులు హాజరు కాలేదు.",
    overall_attendance: "పాఠశాల మొత్తం హాజరు శాతం {percentage}%. క్లాస్ 10-B అత్యధిక హాజరును కలిగి ఉంది.",
    mark_success: "హాజరు విజయవంతంగా నమోదైంది! {name} {date} నాడు {status} గా గుర్తించబడ్డారు.",
    escalate_offer: "నాకు అర్థమైంది. నేను మిమ్మల్ని టీచర్ లేదా పాఠశాల యాజమాన్యంతో కనెక్ట్ చేయగలను. కాల్ కోసం రిక్వెస్ట్ చేయమంటారా?",
    escalate_success: "{target} కి మీ కాల్ రిక్వెస్ట్ విజయవంతంగా పంపబడింది. త్వరలోనే మిమ్మల్ని సంప్రదిస్తారు.",
    unrecognized: "క్షమించండి, నాకు అర్థం కాలేదు. దయచేసి మళ్ళీ చెప్పండి లేదా టీచర్‌తో మాట్లాడించమంటారా?"
  },
  marathi: {
    greet: "नमस्कार! मी XYZ AI, आपला शाळा सहाय्यक आहे. आज मी आपल्याला कशी मदत करू शकतो?",
    help: "मी आपल्याला उपस्थिती पाहण्यास, उपस्थिती नोंदवण्यास किंवा शिक्षक/शाळा व्यवस्थापनाशी संपर्क साधण्यास मदत करू शकतो. आपण काय करू इच्छिता?",
    unauthorized: "प्रवेश नाकारला: आपल्याला ही कृती करण्याची परवानगी नाही.",
    prompt_injection: "धोका: इनपुट सुरक्षा नियमांचे उल्लंघन करते.",
    student_attendance: "आपली उपस्थिती सध्या {percentage}% आहे. आपली {absents} गैरहजेरी नोंदवली गेली आहे.",
    parent_attendance: "तुमच्या पाल्याची ({child}) उपस्थिती {percentage}% आहे. आपण अलीकडील उपस्थिती अहवाल पाहू इच्छिता?",
    teacher_attendance: "विद्यार्थी {name} ची उपस्थिती {percentage}% असून {absents} गैरहजेरी आहेत.",
    overall_attendance: "शाळेची एकूण उपस्थिती {percentage}% आहे. सर्वाधिक उपस्थिती इयत्ता 10-B मध्ये आहे.",
    mark_success: "उपस्थिती यशस्वीरित्या नोंदवली गेली! {name} ला {date} रोजी {status} म्हणून चिन्हांकित केले गेले आहे.",
    escalate_offer: "मी समजू शकतो. मी तुम्हाला शिक्षक किंवा शाळा व्यवस्थापनाशी जोडू शकतो. आपण आता कॉलची विनंती करू इच्छिता?",
    escalate_success: "तुमची कॉल विनंती {target} कडे यशस्वीरित्या सादर करण्यात आली आहे. लवकरच संपर्क केला जाईल.",
    unrecognized: "क्षमस्व, मला समजले नाही. कृपया पुन्हा सांगू शकाल का, की शिक्षकांशी संपर्क साधून देऊ?"
  },
  bengali: {
    greet: "নমস্কার! আমি XYZ AI, আপনার স্কুল সহকারী। আজ আপনাকে কীভাবে সাহায্য করতে পারি?",
    help: "আমি আপনাকে উপস্থিতি দেখতে, ছাত্র উপস্থিতি নথিভুক্ত করতে বা শিক্ষক/ব্যবস্থাপনার সাথে যোগাযোগ করতে সাহায্য করতে পারি। আপনি কী করতে চান?",
    unauthorized: "প্রবেশাধিকার অস্বীকার: আপনার এই কাজটি করার অনুমতি নেই।",
    prompt_injection: "সতর্কতা: ইনপুট নিরাপত্তা পরামিতি লঙ্ঘন করে।",
    student_attendance: "আপনার উপস্থিতি বর্তমানে {percentage}%। আপনার {absents} দিন অনুপস্থিতি নথিভুক্ত আছে।",
    parent_attendance: "আপনার সন্তান {child}-এর উপস্থিতি {percentage}%। আপনি কি সাম্প্রতিক উপস্থিতি রেকর্ড দেখতে চান?",
    teacher_attendance: "ছাত্র {name}-এর উপস্থিতি {percentage}% এবং {absents} দিন অনুপস্থিতি রয়েছে।",
    overall_attendance: "স্কুলের সামগ্রিক উপস্থিতি হার {percentage}%। সবচেয়ে বেশি উপস্থিতি ১০-বি শ্রেণীতে।",
    mark_success: "উপস্থিতি সফলভাবে নথিভুক্ত করা হয়েছে! {name}-কে {date}-এর জন্য {status} চিহ্নিত করা হয়েছে।",
    escalate_offer: "আমি বুঝতে পারছি। আমি আপনাকে শিক্ষক বা স্কুল কর্তৃপক্ষের সাথে সংযুক্ত করতে পারি। আপনি কি এখন কলের অনুরোধ করতে চান?",
    escalate_success: "{target}-এর কাছে আপনার কলের অনুরোধ সফলভাবে জমা দেওয়া হয়েছে। শীঘ্রই আপনার সাথে যোগাযোগ করা হবে।",
    unrecognized: "দুঃখিত, আমি বুঝতে পারিনি। আপনি কি অনুগ্রহ করে বিষয়টি অন্যভাবে বলবেন, নাকি শিক্ষকের সাথে কথা বলিয়ে দেব?"
  },
  gujarati: {
    greet: "નમસ્તે! હું XYZ AI, આપનો શાળા સહાયક છું. આજે હું આપને શું મદદ કરી શકું?",
    help: "હું આપને હાજરી જોવા, વિદ્યાર્થીઓની હાજરી પૂરવા, અથવા શિક્ષક/વહીવટી સ્ટાફનો સંપર્ક કરવામાં મદદ કરી શકું છું. આપ શું કરવા માંગો છો?",
    unauthorized: "પ્રવેશ નામંજૂર: આપને આ પ્રક્રિયા કરવાની પરવાનગી નથી.",
    prompt_injection: "ચેતવણી: ઇનપુટ સુરક્ષા નિયમોનું ઉલ્લંઘન કરે છે.",
    student_attendance: "આપની હાજરી હાલમાં {percentage}% છે. આપની {absents} ગેરહાજરી નોંધાયેલી છે.",
    parent_attendance: "આપના બાળક {child} ની હાજરી {percentage}% છે. શું આપ તાજેતરનો હાજરી રિપોર્ટ જોવા માંગો છો?",
    teacher_attendance: "વિદ્યાર્થી {name} ની હાજરી {percentage}% છે અને {absents} ગેરહાજરી છે.",
    overall_attendance: "શાળાની કુલ હાજરી દર {percentage}% છે. સૌથી વધુ હાજરી ધોરણ 10-B માં છે.",
    mark_success: "હાજરી સફળતાપૂર્વક નોંધાઈ ગઈ છે! {name} ને {date} ના રોજ {status} તરીકે દર્શાવવામાં આવ્યા છે.",
    escalate_offer: "હું સમજી શકું છું. હું આપને શિક્ષક અથવા શાળા સંચાલક સાથે જોડી શકું છું. શું આપ અત્યારે જ કૉલ માટે વિનંતી કરવા માંગો છો?",
    escalate_success: "આપની કૉલ વિનંતી {target} ને સફળતાપૂર્વક મોકલી દેવામાં આવી છે. ટૂંક સમયમાં આપનો સંપર્ક કરવામાં આવશે.",
    unrecognized: "માફ કરશો, હું સમજી શક્યો નથી. શું આપ કૃપા કરીને ફરીથી કહેશો, અથવા હું આપને શિક્ષક સાથે જોડી આપું?"
  },
  punjabi: {
    greet: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ XYZ AI, ਤੁਹਾਡਾ ਸਕੂਲ ਸਹਾਇਕ ਹਾਂ। ਅੱਜ ਮੈਂ ਤੁਹਾਡੀ ਕੀ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ?",
    help: "ਮੈਂ ਹਾਜ਼ਰੀ ਦੇਖਣ, ਵਿਦਿਆਰਥੀ ਹਾਜ਼ਰੀ ਲਗਾਉਣ, ਜਾਂ ਅਧਿਆਪਕ/ਪ੍ਰਬੰਧਕ ਨਾਲ ਸੰਪਰਕ ਕਰਨ ਵਿੱਚ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ। ਤੁਸੀਂ ਕੀ ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ?",
    unauthorized: "ਪਹੁੰਚ ਮਨ੍ਹਾ ਹੈ: ਤੁਹਾਨੂੰ ਇਹ ਕੰਮ ਕਰਨ ਦੀ ਇਜਾਜ਼ਤ ਨਹੀਂ ਹੈ।",
    prompt_injection: "ਚੇਤਾਵਨੀ: ਇਨਪੁਟ ਸੁਰੱਖਿਆ ਨਿਯਮਾਂ ਦੀ ਉਲੰਘਣਾ ਕਰਦਾ ਹੈ।",
    student_attendance: "ਤੁਹਾਡੀ ਹਾਜ਼ਰੀ ਇਸ ਵੇਲੇ {percentage}% ਹੈ। ਤੁਹਾਡੀਆਂ {absents} ਗੈਰ-ਹਾਜ਼ਰੀਆਂ ਦਰਜ ਹਨ।",
    parent_attendance: "ਤੁਹਾਡੇ ਬੱਚੇ {child} ਦੀ ਹਾਜ਼ਰੀ {percentage}% ਹੈ। ਕੀ ਤੁਸੀਂ ਹਾਲੀਆ ਹਾਜ਼ਰੀ ਰਿਕਾਰਡ ਦੇਖਣਾ ਚਾਹੁੰਦੇ ਹੋ?",
    teacher_attendance: "ਵਿਦਿਆਰਥੀ {name} ਦੀ ਹਾਜ਼ਰੀ {percentage}% ਹੈ ਜਿਸ ਵਿੱਚ {absents} ਗੈਰ-ਹਾਜ਼ਰੀਆਂ ਸ਼ਾਮਲ ਹਨ।",
    overall_attendance: "ਸਕੂਲ ਦੀ ਕੁੱਲ ਹਾਜ਼ਰੀ ਦਰ {percentage}% ਹੈ। ਸਭ ਤੋਂ ਵੱਧ ਹਾਜ਼ਰੀ ਕਲਾਸ 10-B ਵਿੱਚ ਹੈ।",
    mark_success: "ਹਾਜ਼ਰੀ ਸਫਲਤਾਪੂਰਵਕ ਲੱਗ ਗਈ ਹੈ! {name} ਨੂੰ {date} ਲਈ {status} ਲਗਾਇਆ ਗਿਆ ਹੈ।",
    escalate_offer: "ਮੈਂ ਸਮਝ ਸਕਦਾ ਹਾਂ। ਮੈਂ ਤੁਹਾਨੂੰ ਅਧਿਆਪਕ ਜਾਂ ਸਕੂਲ ਪ੍ਰਬੰਧਕ ਨਾਲ ਜੋੜ ਸਕਦਾ ਹਾਂ। ਕੀ ਤੁਸੀਂ ਹੁਣੇ ਕਾਲ ਦੀ ਬੇਨਤੀ ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ?",
    escalate_success: "ਤੁਹਾਡੀ ਕਾਲ ਬੇਨਤੀ {target} ਨੂੰ ਸਫਲਤਾਪੂਰਵਕ ਭੇਜ ਦਿੱਤੀ ਗਈ ਹੈ। ਜਲਦੀ ਹੀ ਤੁਹਾਡੇ ਨਾਲ ਸੰਪਰਕ ਕੀਤਾ ਜਾਵੇਗਾ।",
    unrecognized: "ਮਾਫ਼ ਕਰਨਾ, ਮੈਨੂੰ ਸਮਝ ਨਹੀਂ ਆਇਆ। ਕੀ ਤੁਸੀਂ ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਦੱਸ ਸਕਦੇ ਹੋ, ਜਾਂ ਅਧਿਆਪਕ ਨਾਲ ਗੱਲ ਕਰਵਾਵਾਂ?"
  },
  kannada: {
    greet: "ನಮಸ್ಕಾರ! ನಾನು XYZ AI, ನಿಮ್ಮ ಶಾಲಾ ಸಹಾಯಕ. ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?",
    help: "ನಾನು ನಿಮಗೆ ಹಾಜರಾತಿ ನೋಡಲು, ವಿದ್ಯಾರ್ಥಿಗಳ ಹಾಜರಾತಿ ದಾಖಲಿಸಲು ಅಥವಾ ಶಿಕ್ಷಕರು/ಆಡಳಿತ ಮಂಡಳಿಯನ್ನು ಸಂಪರ್ಕಿಸಲು ಸಹಾಯ ಮಾಡಬಹುದು. ನೀವು ಏನು ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?",
    unauthorized: "ಪ್ರವೇಶ ನಿರಾಕರಿಸಲಾಗಿದೆ: ನಿಮಗೆ ಈ ಕ್ರಿಯೆಯನ್ನು ಮಾಡಲು ಅನುಮತಿಯಿಲ್ಲ.",
    prompt_injection: "ಎಚ್ಚರಿಕೆ: ಇನ್‌ಪುಟ್ ಸುರಕ್ಷತಾ ನಿಯಮಗಳನ್ನು ಉಲ್ಲಂಘಿಸುತ್ತದೆ.",
    student_attendance: "ನಿಮ್ಮ ಹಾಜರಾತಿ ಪ್ರಸ್ತುತ {percentage}% ಆಗಿದೆ. ನಿಮ್ಮ {absents} ದಿನಗಳ ಗೈರುಹಾಜರಿ ದಾಖಲಾಗಿದೆ.",
    parent_attendance: "ನಿಮ್ಮ ಮಗು {child} ನ ಹಾಜರಾತಿ {percentage}% ಆಗಿದೆ. ಇತ್ತೀಚಿನ ಹಾಜರಾತಿ ದಾಖಲೆಗಳನ್ನು ಪರಿಶೀಲಿಸಬೇಕೇ?",
    teacher_attendance: "ವಿದ್ಯಾರ್ಥಿ {name} ಹಾಜರಾತಿ {percentage}% ಆಗಿದ್ದು, {absents} ದಿನಗಳು ಗೈರುಹಾಜರಾಗಿದ್ದಾರೆ.",
    overall_attendance: "ಶಾಲೆಯ ಒಟ್ಟಾರೆ ಹಾಜರಾತಿ ಪ್ರಮಾಣ {percentage}% ಆಗಿದೆ. ಗರಿಷ್ಠ ಹಾಜರಾತಿ 10-B ತರಗತಿಯಲ್ಲಿದೆ.",
    mark_success: "ಹಾಜರಾತಿಯನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಗುರುತಿಸಲಾಗಿದೆ! {name} ಅವರನ್ನು {date} ರಂದು {status} ಎಂದು ಗುರುತಿಸಲಾಗಿದೆ.",
    escalate_offer: "ನನಗೆ ಅರ್ಥವಾಗುತ್ತದೆ. ನಾನು ನಿಮ್ಮನ್ನು ಶಿಕ್ಷಕರು ಅಥವಾ ಶಾಲಾ ಆಡಳಿತ ಮಂಡಳಿಗೆ ಸಂಪರ್ಕಿಸಬಹುದು. ಈಗಲೇ ಕರೆಗೆ ವಿನಂತಿಸಲು ಬಯಸುವಿರಾ?",
    escalate_success: "ನಿಮ್ಮ ಕರೆ ವಿನಂತಿಯನ್ನು {target} ಗೆ ಯಶಸ್ವಿಯಾಗಿ ಸಲ್ಲಿಸಲಾಗಿದೆ. ಶೀಘ್ರದಲ್ಲೇ ನಿಮ್ಮನ್ನು ಸಂಪರ್ಕಿಸಲಾಗುತ್ತದೆ.",
    unrecognized: "ಕ್ಷಮಿಸಿ, ನನಗೆ ಅರ್ಥವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೊಮ್ಮೆ ಹೇಳಬಹುದೇ, ಅಥವಾ ಶಿಕ್ಷಕರಿಗೆ ಸಂಪರ್ಕಿಸಬೇಕೇ?"
  },
  malayalam: {
    greet: "നമസ്കാരം! ഞാൻ XYZ AI, നിങ്ങളുടെ സ്കൂൾ അസിസ്റ്റന്റ് ആണ്. ഇന്ന് ഞാൻ എങ്ങനെ സഹായിക്കണം?",
    help: "ഹാജർ നില കാണാനും, വിദ്യാർത്ഥികളുടെ ഹാജർ രേഖപ്പെടുത്താനും, അല്ലെങ്കിൽ അധ്യാപകർ/മാനേജ്‌മെന്റുമായി ബന്ധപ്പെടാനും എനിക്ക് സഹായിക്കാം. നിങ്ങൾ എന്താണ് ചെയ്യാൻ ആഗ്രഹിക്കുന്നത്?",
    unauthorized: "അനുമതി നിഷേധിച്ചിരിക്കുന്നു: ഈ പ്രവർത്തനം ചെയ്യാൻ നിങ്ങൾക്ക് അനുമതിയില്ല.",
    prompt_injection: "മുന്നറിയിപ്പ്: ഇൻപുട്ട് സുരക്ഷാ നിയമങ്ങൾ ലംഘിക്കുന്നു.",
    student_attendance: "നിങ്ങളുടെ ഹാജർ നില നിലവിൽ {percentage}% ആണ്. {absents} ദിവസത്തെ അസാന്നിധ്യം രേഖപ്പെടുത്തിയിട്ടുണ്ട്.",
    parent_attendance: "നിങ്ങളുടെ കുട്ടി {child}-ന്റെ ഹാജർ നില {percentage}% ആണ്. സമീപകാലത്തെ ഹാജർ വിവരങ്ങൾ പരിശോധിക്കണോ?",
    teacher_attendance: "വിദ്യാർത്ഥി {name}-ന്റെ ഹാജർ നില {percentage}% ആണ്, {absents} ദിവസം ഹാജരായില്ല.",
    overall_attendance: "സ്കൂളിന്റെ ആകെ ഹാജർ നില {percentage}% ആണ്. ഏറ്റവും കൂടുതൽ ഹാജരുള്ളത് ക്ലാസ് 10-B-യിലാണ്.",
    mark_success: "ഹാജർ വിജയകരമായി രേഖപ്പെടുത്തി! {name}-നെ {date}-ൽ {status} ആയി രേഖപ്പെടുത്തിയിരിക്കുന്നു.",
    escalate_offer: "എനിക്ക് മനസ്സിലായി. ഞാൻ നിങ്ങളെ അധ്യാപകനുമായോ സ്കൂൾ മാനേജ്‌മെന്റുമായോ ബന്ധിപ്പിക്കാം. ഇപ്പോൾ വിളിക്കാൻ അഭ്യർത്ഥിക്കണോ?",
    escalate_success: "നിങ്ങളുടെ കോൾ അഭ്യർത്ഥന {target}-ലേക്ക് വിജയകരമായി സമർപ്പിച്ചു. ഉടൻ തന്നെ നിങ്ങളെ ബന്ധപ്പെടുന്നതാണ്.",
    unrecognized: "ക്ഷമിക്കണം, എനിക്ക് വ്യക്തമായി മനസ്സിലായില്ല. ദയവായി വീണ്ടും പറയാമോ, അതോ അധ്യാപകനുമായി ബന്ധിപ്പിക്കണോ?"
  },
  urdu: {
    greet: "سلام! میں XYZ AI، آپ کا اسکول اسسٹنٹ ہوں۔ آج میں آپ کی کیا مدد کر سکتا ہوں؟",
    help: "میں آپ کی حاضری دیکھنے، طلباء کی حاضری لگانے، یا اساتذہ/انتظامیہ سے رابطہ کرنے میں مدد کر سکتا ہوں۔ آپ کیا کرنا چاہیں گے؟",
    unauthorized: "رسائی مسترد: آپ کو یہ عمل کرنے کی اجازت نہیں ہے۔",
    prompt_injection: "انتباہ: ان پٹ حفاظتی پیرامیٹرز کی خلاف ورزی کرتا ہے۔",
    student_attendance: "آپ کی حاضری اس وقت {percentage}% ہے۔ آپ کی {absents} غیر حاضری درج ہے۔",
    parent_attendance: "آپ کے بچے {child} کی حاضری {percentage}% ہے۔ کیا آپ چاہتے ہیں کہ میں حاضری کا حالیہ ریکارڈ دیکھوں؟",
    teacher_attendance: "طالب علم {name} کی حاضری {percentage}% ہے جس میں {absents} غیر حاضری شامل ہیں۔",
    overall_attendance: "اسکول کی کل حاضری کی شرح {percentage}% ہے۔ سب سے زیادہ حاضری کلاس 10-B میں ہے۔",
    mark_success: "حاضری کامیابی سے درج کر دی گئی! {name} کو {date} کے لیے {status} نشان زد کیا گیا ہے۔",
    escalate_offer: "میں سمجھ سکتا ہوں۔ میں آپ کو استاد یا اسکول انتظامیہ سے جوڑ سکتا ہوں۔ کیا آپ ابھی کال کی درخواست کرنا چاہتے ہیں؟",
    escalate_success: "آپ کی کال کی درخواست {target} کو کامیابی سے بھیج دی گئی ہے۔ جلد ہی آپ سے رابطہ کیا جائے گا۔",
    unrecognized: "مجھے معذرت ہے، میں سمجھ نہیں پایا۔ کیا آپ براہ کرم اپنی بات دہرا سکتے ہیں، یا کیا آپ چاہتے ہیں کہ میں آپ کو استاد سے جوڑوں؟"
  }
};

module.exports = {
  processQuery: (message, userRole, languageName = 'english') => {
    const text = (message || "").toLowerCase().trim();
    const role = (userRole || "").toLowerCase().trim();
    
    // Normalize language key
    let langKey = languageName.toLowerCase().trim();
    if (!TRANSLATIONS[langKey]) {
      langKey = 'english'; // Default fallback
    }
    
    const lang = TRANSLATIONS[langKey];
    
    // 1. HELP DETECTOR
    if (text.includes("help") || text.includes("madad") || text.includes("सहायता") || text.includes("உதவி") || text.includes("సహాయం") || text.includes("मदत")) {
      return { response: lang.help };
    }
    
    // 2. GREETINGS DETECTOR
    if (text.includes("hello") || text.includes("hi") || text.includes("hey") || text.includes("namaste") || text.includes("வணக்கம்") || text.includes("నమస్కారం") || text.includes("سلام")) {
      return { response: lang.greet };
    }

    // 3. ESCALATION (CONFIRMATION) DETECTOR
    if (text === "yes" || text === "haan" || text === "amama" || text === "avunu" || text === "ho" || text === "yes please" || text === "हाँ" || text === "ஆம்" || text === "అవును") {
      // Create escalation in DB based on role context
      const target = (role === "parent") ? "Class Teacher" : "School Management";
      const name = (role === "parent") ? "Mrs. Sharma (Parent)" : "Student (S101)";
      db.createEscalation(userRole, name, (role === "parent" ? "Teacher Call" : "Management Call"), "User requested escalation via chat fallback.");
      return {
        response: lang.escalate_success.replace("{target}", target),
        actionTriggered: "escalate_success"
      };
    }

    // 4. ESCALATION (REQUEST) DETECTOR
    const escalationKeywords = [
      "teacher", "management", "principal", "call", "talk", "connect", "callback", "satisfy", "satisfied", "escalate",
      "शिकायत", "शिक्षक", "பேச வேண்டும்", "మాట్లాడాలి", "बोलायचे", "কথা বলতে", "વાત કરવી", "ਗੱਲ ਕਰਨੀ", "ಮಾತನಾಡಬೇಕು", "സംസാരിക്കണം", "بات کرنی"
    ];
    if (escalationKeywords.some(kw => text.includes(kw))) {
      return {
        response: lang.escalate_offer,
        actionTriggered: "escalate_offer"
      };
    }

    // 5. ATTENDANCE ANALYTICS DETECTOR (Principal Only)
    const analyticsKeywords = [
      "overall", "whole school", "school-wide", "school attendance", "analytics", "trends", "statistics",
      "कुल उपस्थिति", "ஒட்டுமொத்த", "మొత్తం హాజరు", "शाळेची एकूण"
    ];
    if (analyticsKeywords.some(kw => text.includes(kw))) {
      if (role !== "principal") {
        return { response: lang.unauthorized, error: "Access Denied: principal role required" };
      }
      const overall = db.getOverallAttendance();
      return {
        response: lang.overall_attendance.replace("{percentage}", overall),
        data: { overall }
      };
    }

    // 6. ATTENDANCE MARKING DETECTOR (Teacher Only)
    const markKeywords = [
      "mark", "absent", "present", "attendance to", "register",
      "दर्ज करें", "குறிக்கவும்", "గుర్తించు", "नोंदवा", "চিহ্নিত", "નોંધો", "ਲਗਾਓ", "ಗುರುತಿಸಿ", "രേഖപ്പെടുത്തുക", "نشان زد"
    ];
    if (markKeywords.some(kw => text.includes(kw)) && (text.includes("absent") || text.includes("present") || text.includes("bimar") || text.includes("unfit") || text.includes("bina") || text.includes("gair") || text.includes("gairhazir") || text.includes("hazir"))) {
      if (role !== "teacher") {
        return { response: lang.unauthorized, error: "Access Denied: teacher role required" };
      }

      // Extract student name (Simple extraction logic)
      let name = "Rahul Sharma"; // Default mock target matching example
      if (text.includes("priya")) name = "Priya Patel";
      if (text.includes("amit")) name = "Amit Verma";
      if (text.includes("sneha")) name = "Sneha Reddy";

      const isAbsent = text.includes("absent") || text.includes("gair") || text.includes("bimar");
      const status = isAbsent ? "Absent" : "Present";
      const date = new Date().toISOString().split('T')[0];
      const reason = isAbsent ? "Medical/Unspecified" : "";

      db.updateAttendance(name, date, status, reason);
      
      return {
        response: lang.mark_success
          .replace("{name}", name)
          .replace("{status}", status)
          .replace("{date}", date),
        data: { name, status, date }
      };
    }

    // 7. VIEW ATTENDANCE DETECTOR (All roles check)
    const attendanceKeywords = [
      "attendance", "percentage", "percent", "absences", "leaves",
      "حاضری", "उपस्थिति", "வருகை", "ಹಾಜರಾತಿ", "ഹാജർ", "ഹാജരാതി", "హాజరు", "उपस्थिती", "উপস্থিতি", "હાજરી", "ਹਾਜ਼ਰੀ"
    ];
    if (attendanceKeywords.some(kw => text.includes(kw))) {
      // Student checking own
      if (role === "student") {
        const student = db.getStudentById("S101"); // Logged in student
        const absents = student.history.filter(h => h.status === 'Absent').length;
        return {
          response: lang.student_attendance.replace("{percentage}", student.attendance).replace("{absents}", absents),
          data: { student }
        };
      }
      
      // Parent checking child's
      if (role === "parent") {
        const student = db.getStudentByParent("Mrs. Sharma"); // Mapped parent
        return {
          response: lang.parent_attendance.replace("{child}", student.name).replace("{percentage}", student.attendance),
          data: { student }
        };
      }

      // Teacher/Principal checking a student's
      if (role === "teacher" || role === "principal") {
        let name = "Rahul Sharma"; // default
        if (text.includes("priya")) name = "Priya Patel";
        if (text.includes("amit")) name = "Amit Verma";
        if (text.includes("sneha")) name = "Sneha Reddy";
        
        const student = db.getStudentByName(name);
        if (student) {
          const absents = student.history.filter(h => h.status === 'Absent').length;
          return {
            response: lang.teacher_attendance.replace("{name}", student.name).replace("{percentage}", student.attendance).replace("{absents}", absents),
            data: { student }
          };
        }
      }
    }

    // Default fallback unrecognized
    return {
      response: lang.unrecognized
    };
  }
};
