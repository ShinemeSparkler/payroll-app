import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    signOut 
} from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    onSnapshot, 
    query, 
    where 
} from 'firebase/firestore';

// --- Firebase 설정 ---
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'payroll-app-v1';

// --- 컴포넌트 ---

const Spinner = () => (
    <div className="flex justify-center items-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>
);

const MessageBox = ({ message, type, onClose }) => {
    if (!message) return null;
    const colors = {
        success: 'bg-green-100 border-green-400 text-green-700',
        error: 'bg-red-100 border-red-400 text-red-700',
        info: 'bg-blue-100 border-blue-400 text-blue-700',
    };
    return (
        <div className={`border px-4 py-3 rounded-lg relative my-4 ${colors[type] || colors.info}`} role="alert">
            <span className="block sm:inline">{message}</span>
            <span className="absolute top-0 bottom-0 right-0 px-4 py-3 cursor-pointer" onClick={onClose}>
                <svg className="fill-current h-6 w-6 text-gray-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>닫기</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
            </span>
        </div>
    );
};

// 팀 데이터 입력 뷰
const TeamView = ({ userProfile, year, month, setMessageBox }) => {
    const { teamId } = userProfile;
    const [employees, setEmployees] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        const docId = `${appId}-${teamId}-${year}-${month}`;
        const docRef = doc(db, "payrollData", docId);
        
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setEmployees(data.employees.map(emp => ({ ...emp, id: emp.id || crypto.randomUUID() })));
            } else {
                setEmployees([]);
            }
            setIsLoading(false);
        }, (error) => {
            setMessageBox({ message: `[${teamId}팀] 데이터를 불러오는 데 실패했습니다. Firestore 보안 규칙을 확인하세요.`, type: 'error' });
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [teamId, year, month, setMessageBox]);

    const loadPreviousMonthData = async () => {
        let prevYear = year;
        let prevMonth = month - 1;
        if (prevMonth === 0) { prevMonth = 12; prevYear = year - 1; }
        const prevDocId = `${appId}-${teamId}-${prevYear}-${prevMonth}`;
        const prevDocRef = doc(db, "payrollData", prevDocId);
        try {
            const docSnap = await getDoc(prevDocRef);
            if (docSnap.exists()) {
                const newEmployees = docSnap.data().employees.map(emp => ({ ...emp, id: crypto.randomUUID() }));
                setEmployees(newEmployees);
                setMessageBox({ message: `${prevYear}년 ${prevMonth}월 데이터를 불러왔습니다. 저장 버튼을 눌러 현재 월에 반영하세요.`, type: 'success' });
            } else {
                setMessageBox({ message: `${prevYear}년 ${prevMonth}월 데이터가 없습니다.`, type: 'info' });
            }
        } catch (error) {
            setMessageBox({ message: "이전 달 데이터를 불러오는 데 실패했습니다.", type: 'error' });
        }
    };

    const addEmployee = () => {
        setEmployees([...employees, { 
            id: crypto.randomUUID(), name: '', rrn: '', grossPay: '', tax: '',
            bank: '', accountNumber: '', contact: '', remarks: '' 
        }]);
    };

    const handleEmployeeChange = (id, field, value) => {
        setEmployees(employees.map(emp => emp.id === id ? { ...emp, [field]: value } : emp));
    };

    const removeEmployee = (id) => {
        setEmployees(employees.filter(emp => emp.id !== id));
    };

    const saveData = async () => {
        const docId = `${appId}-${teamId}-${year}-${month}`;
        const docRef = doc(db, "payrollData", docId);
        try {
            await setDoc(docRef, { teamId, year, month, employees, updatedAt: new Date() });
            setMessageBox({ message: `[${teamId}팀] ${year}년 ${month}월 데이터가 성공적으로 저장되었습니다.`, type: 'success' });
        } catch (error) {
            setMessageBox({ message: "데이터 저장에 실패했습니다. 권한을 확인해주세요.", type: 'error' });
        }
    };
    
    return (
        <div className="bg-white p-6 rounded-xl shadow-lg mt-4">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">{`팀 [${teamId}] - ${year}년 ${month}월 급여 입력`}</h2>
                <button onClick={loadPreviousMonthData} className="px-4 py-2 bg-indigo-500 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-600">
                    이전 달 정보 불러오기
                </button>
            </div>
            {isLoading ? <Spinner /> : (
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                            <tr>
                                <th className="px-2 py-3">번호</th>
                                <th className="px-4 py-3">이름</th>
                                <th className="px-4 py-3">주민번호</th>
                                <th className="px-4 py-3">금액(세전)</th>
                                <th className="px-4 py-3">세금</th>
                                <th className="px-4 py-3">거래은행</th>
                                <th className="px-4 py-3">계좌번호</th>
                                <th className="px-4 py-3">연락처</th>
                                <th className="px-4 py-3">비고</th>
                                <th className="px-2 py-3">삭제</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map((emp, index) => (
                                <tr key={emp.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-2 py-4 text-center font-semibold">{index + 1}</td>
                                    <td className="px-4 py-2"><input type="text" value={emp.name} onChange={(e) => handleEmployeeChange(emp.id, 'name', e.target.value)} className="w-24 p-2 border rounded-md bg-gray-50" /></td>
                                    <td className="px-4 py-2"><input type="text" value={emp.rrn} onChange={(e) => handleEmployeeChange(emp.id, 'rrn', e.target.value)} className="w-32 p-2 border rounded-md bg-gray-50" /></td>
                                    <td className="px-4 py-2"><input type="number" value={emp.grossPay} onChange={(e) => handleEmployeeChange(emp.id, 'grossPay', e.target.value)} className="w-32 p-2 border rounded-md bg-gray-50" /></td>
                                    <td className="px-4 py-2"><input type="number" value={emp.tax} onChange={(e) => handleEmployeeChange(emp.id, 'tax', e.target.value)} className="w-28 p-2 border rounded-md bg-gray-50" /></td>
                                    <td className="px-4 py-2"><input type="text" value={emp.bank} onChange={(e) => handleEmployeeChange(emp.id, 'bank', e.target.value)} className="w-28 p-2 border rounded-md bg-gray-50" /></td>
                                    <td className="px-4 py-2"><input type="text" value={emp.accountNumber} onChange={(e) => handleEmployeeChange(emp.id, 'accountNumber', e.target.value)} className="w-40 p-2 border rounded-md bg-gray-50" /></td>
                                    <td className="px-4 py-2"><input type="text" value={emp.contact} onChange={(e) => handleEmployeeChange(emp.id, 'contact', e.target.value)} className="w-32 p-2 border rounded-md bg-gray-50" /></td>
                                    <td className="px-4 py-2">
                                        <textarea value={emp.remarks} onChange={(e) => handleEmployeeChange(emp.id, 'remarks', e.target.value)} className="w-full p-2 border rounded-md bg-gray-50" rows="2"></textarea>
                                    </td>
                                    <td className="px-2 py-4 text-center"><button onClick={() => removeEmployee(emp.id)} className="font-medium text-red-600 hover:underline">X</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <div className="flex justify-between items-center mt-6">
                <button onClick={addEmployee} className="px-6 py-2 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600">직원 추가</button>
                <button onClick={saveData} className="px-6 py-2 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600">저장하기</button>
            </div>
        </div>
    );
};

const teamOrder = ['W', 'J', 'K', 'F', 'S', 'O', 'B', 'C', '고1', '기타'];

const AdminView = ({ year, month, setMessageBox }) => {
    const [allData, setAllData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        const q = query(collection(db, "payrollData"), where("year", "==", year), where("month", "==", month));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const sortedData = data.sort((a, b) => teamOrder.indexOf(a.teamId) - teamOrder.indexOf(b.teamId));
            setAllData(sortedData);
            setIsLoading(false);
        }, (error) => {
            setMessageBox({ message: "전체 데이터를 불러오는 데 실패했습니다. Firestore 보안 규칙을 확인하세요.", type: 'error' });
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [year, month, setMessageBox]);
    
    const exportToExcel = () => {
        if (typeof window.XLSX === 'undefined') {
            setMessageBox({ message: "엑셀 라이브러리를 로드하는 중입니다. 잠시 후 다시 시도해주세요.", type: 'info' });
            return;
        }
        if (allData.length === 0) {
            setMessageBox({ message: "내보낼 데이터가 없습니다.", type: 'info' });
            return;
        }

        const excelData = [];
        let rowNum = 1;
        allData.forEach(teamData => {
            teamData.employees.forEach(emp => {
                const grossPay = Number(emp.grossPay) || 0;
                const tax = Number(emp.tax) || 0;
                excelData.push({
                    '번호': rowNum++,
                    '팀': teamData.teamId,
                    '이름': emp.name,
                    '주민번호': emp.rrn,
                    '연락처': emp.contact,
                    '은행': emp.bank,
                    '계좌번호': emp.accountNumber,
                    '금액': grossPay,
                    '세금': tax,
                    '실지급액': grossPay - tax,
                    '비고': emp.remarks,
                });
            });
        });

        const worksheet = window.XLSX.utils.json_to_sheet(excelData);
        const workbook = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(workbook, worksheet, "급여명세서");

        worksheet["!cols"] = [
            { wch: 5 }, { wch: 8 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, 
            { wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 30 }
        ];

        window.XLSX.writeFile(workbook, `${year}년_${month}월_급여내역.xlsx`);
        setMessageBox({ message: "엑셀 파일이 성공적으로 다운로드되었습니다.", type: 'success' });
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg mt-4">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">{`관리자 대시보드 - ${year}년 ${month}월`}</h2>
                <button onClick={exportToExcel} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700">
                    엑셀로 내보내기
                </button>
            </div>
            {isLoading ? <Spinner /> : allData.length === 0 ? (
                <p className="text-center text-gray-500 py-4">해당 월에 제출된 데이터가 없습니다.</p>
            ) : (
                <div className="space-y-8">
                    {allData.map(teamData => (
                        <div key={teamData.id} className="p-4 border rounded-lg bg-gray-50">
                            <h3 className="text-xl font-bold text-blue-600 mb-3">{`팀 [${teamData.teamId}]`}</h3>
                             <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left text-gray-500">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-200">
                                        <tr>
                                            <th>번호</th><th>이름</th><th>주민번호</th><th>금액(세전)</th><th>세금</th><th>은행</th><th>계좌번호</th><th>연락처</th><th>비고</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {teamData.employees.map((emp, index) => {
                                            const grossPay = Number(emp.grossPay) || 0;
                                            const tax = Number(emp.tax) || 0;
                                            return (
                                                <tr key={emp.id || index} className="bg-white border-b">
                                                    <td className="px-2 py-4 text-center">{index + 1}</td>
                                                    <td className="px-4 py-4">{emp.name}</td>
                                                    <td className="px-4 py-4">{emp.rrn}</td>
                                                    <td className="px-4 py-4">{grossPay.toLocaleString()} 원</td>
                                                    <td className="px-4 py-4">{tax.toLocaleString()} 원</td>
                                                    <td className="px-4 py-4">{emp.bank}</td>
                                                    <td className="px-4 py-4">{emp.accountNumber}</td>
                                                    <td className="px-4 py-4">{emp.contact}</td>
                                                    <td className="px-4 py-4 w-64 whitespace-pre-wrap">{emp.remarks}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// 인증 페이지 (로그인 전용)
const AuthPage = ({ setMessageBox }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessageBox({ message: null });
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            let errorMessage = "로그인에 실패했습니다. 이메일 또는 비밀번호를 확인해주세요.";
            if (error.code === 'auth/invalid-credential') {
                 errorMessage = "이메일 또는 비밀번호가 올바르지 않습니다.";
            }
            setMessageBox({ message: errorMessage, type: 'error' });
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center font-sans">
            <div className="w-full max-w-md mx-auto p-8 space-y-6 bg-white rounded-2xl shadow-2xl">
                <div className="text-center">
                    <h1 className="text-3xl font-extrabold text-gray-900">급여 관리 시스템</h1>
                    <p className="mt-2 text-gray-500">로그인</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-sm font-bold text-gray-600 block">이메일</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-2 border border-gray-300 rounded-lg mt-1" />
                    </div>
                    <div>
                        <label className="text-sm font-bold text-gray-600 block">비밀번호</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full p-2 border border-gray-300 rounded-lg mt-1" />
                    </div>
                    <button type="submit" className="w-full px-4 py-2 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700">로그인</button>
                </form>
            </div>
        </div>
    );
};


// 메인 앱
export default function App() {
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [messageBox, setMessageBox] = useState({ message: null, type: 'info' });

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
    const months = Array.from({ length: 12 }, (_, i) => i + 1);

    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js';
        script.async = true;
        document.head.appendChild(script);
        return () => { document.head.removeChild(script); };
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const userDocRef = doc(db, "users", currentUser.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    setUserProfile(userDocSnap.data());
                } else {
                    console.error("Firestore에 사용자 프로필이 없습니다. 관리자에게 문의하세요.");
                    setUserProfile(null); 
                    await signOut(auth);
                }
                setUser(currentUser);
            } else {
                setUser(null);
                setUserProfile(null);
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleLogout = async () => {
        await signOut(auth);
    };

    if (isLoading) {
        return <div className="bg-gray-100 min-h-screen flex items-center justify-center"><Spinner /><p className="ml-2">인증 정보 확인 중...</p></div>;
    }

    if (!user) {
        return <AuthPage setMessageBox={setMessageBox} />;
    }

    return (
        <div className="min-h-screen bg-gray-100 font-sans p-4 sm:p-6 lg:p-8">
            <div className="max-w-screen-2xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl p-6 mb-4">
                    <div className="flex flex-wrap justify-between items-center gap-4">
                        <div className="flex items-center gap-4">
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                                {userProfile?.role === 'admin' ? '관리자 대시보드' : `팀 [${userProfile?.teamId}] 급여 입력`}
                            </h1>
                            <span className="text-sm text-gray-500">{user.email}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="p-2 border rounded-lg bg-gray-50 shadow-sm">
                                {years.map(y => <option key={y} value={y}>{y}년</option>)}
                            </select>
                            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="p-2 border rounded-lg bg-gray-50 shadow-sm">
                                {months.map(m => <option key={m} value={m}>{m}월</option>)}
                            </select>
                            <button onClick={handleLogout} className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-600">로그아웃</button>
                        </div>
                    </div>
                </div>
                <MessageBox message={messageBox.message} type={messageBox.type} onClose={() => setMessageBox({ message: null })} />
                
                {userProfile?.role === 'admin' && <AdminView year={year} month={month} setMessageBox={setMessageBox} />}
                {userProfile?.role === 'team' && <TeamView userProfile={userProfile} year={year} month={month} setMessageBox={setMessageBox} />}
            </div>
        </div>
    );
}
