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
// 중요: 이 부분은 실제 Firebase 프로젝트의 설정 값으로 교체해야 합니다.
const firebaseConfig = {
    apiKey: "AIzaSyCaJInzTmXRzVNcn4a5Tq39k4ljGTDRz7I",
    authDomain: "math-ff860.firebaseapp.com",
    projectId: "math-ff860",
    storageBucket: "math-ff860.firebasestorage.app",
    messagingSenderId: "993047593248",
    appId: "1:993047593248:web:3290e48ea3680247d89745"
  };
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
    const docId = `${appId}-${teamId}-${year}-${month}`;
    const docRef = doc(db, "payrollData", docId);

    useEffect(() => {
        setIsLoading(true);
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setEmployees(data.employees.map(emp => ({ ...emp, id: emp.id || crypto.randomUUID() })));
            } else {
                setEmployees([]);
            }
            setIsLoading(false);
        }, (error) => {
            console.error("팀 데이터 로딩 중 오류:", error);
            setMessageBox({ message: `[${teamId}팀] 데이터를 불러오는 데 실패했습니다. Firestore 보안 규칙을 확인하세요.`, type: 'error' });
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [teamId, year, month]);

    const addEmployee = () => {
        setEmployees([...employees, { 
            id: crypto.randomUUID(), name: '', rrn: '', grossPay: '', 
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
        try {
            await setDoc(docRef, { teamId, year, month, employees, updatedAt: new Date() });
            setMessageBox({ message: `[${teamId}팀] ${year}년 ${month}월 데이터가 성공적으로 저장되었습니다.`, type: 'success' });
        } catch (error) {
            console.error("저장 중 오류:", error);
            setMessageBox({ message: "데이터 저장에 실패했습니다. 권한을 확인해주세요.", type: 'error' });
        }
    };
    
    return (
        <div className="bg-white p-6 rounded-xl shadow-lg mt-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">{`팀 [${teamId}] - ${year}년 ${month}월 급여 입력`}</h2>
            {isLoading ? <Spinner /> : (
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                            <tr>
                                <th className="px-2 py-3">번호</th>
                                <th className="px-4 py-3">이름</th>
                                <th className="px-4 py-3">주민번호</th>
                                <th className="px-4 py-3">지급액(세전)</th>
                                <th className="px-4 py-3">거래은행</th>
                                <th className="px-4 py-3">계좌번호</th>
                                <th className="px-4 py-3">연락처</th>
                                <th className="px-4 py-3">과목(상세)</th>
                                <th className="px-4 py-3">내용</th>
                                <th className="px-4 py-3">비고</th>
                                <th className="px-2 py-3">삭제</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map((emp, index) => (
                                <tr key={emp.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-2 py-4 text-center font-semibold">{index + 1}</td>
                                    <td className="px-4 py-2"><input type="text" value={emp.name} onChange={(e) => handleEmployeeChange(emp.id, 'name', e.target.value)} className="w-24 p-2 border rounded-md bg-gray-50" /></td>
                                    <td className="px-4 py-2"><input type="text" value={emp.rrn} onChange={(e) => handleEmployeeChange(emp.id, 'rrn', e.target.value)} className="w-32 p-2 border rounded-md bg-gray-50" placeholder="ex) 900101-1******" /></td>
                                    <td className="px-4 py-2"><input type="number" value={emp.grossPay} onChange={(e) => handleEmployeeChange(emp.id, 'grossPay', e.target.value)} className="w-32 p-2 border rounded-md bg-gray-50" placeholder="숫자만 입력" /></td>
                                    <td className="px-4 py-2"><input type="text" value={emp.bank} onChange={(e) => handleEmployeeChange(emp.id, 'bank', e.target.value)} className="w-28 p-2 border rounded-md bg-gray-50" /></td>
                                    <td className="px-4 py-2"><input type="text" value={emp.accountNumber} onChange={(e) => handleEmployeeChange(emp.id, 'accountNumber', e.target.value)} className="w-40 p-2 border rounded-md bg-gray-50" /></td>
                                    <td className="px-4 py-2"><input type="text" value={emp.contact} onChange={(e) => handleEmployeeChange(emp.id, 'contact', e.target.value)} className="w-32 p-2 border rounded-md bg-gray-50" /></td>
                                    <td className="px-4 py-2 text-center">수학</td>
                                    <td className="px-4 py-2 text-center">{`수학${teamId}팀`}</td>
                                    <td className="px-4 py-2">
                                        <textarea value={emp.remarks} onChange={(e) => handleEmployeeChange(emp.id, 'remarks', e.target.value)} className="w-full p-2 border rounded-md bg-gray-50" rows="3"></textarea>
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

// 관리자 뷰
const AdminView = ({ year, month, setMessageBox }) => {
    const [allData, setAllData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const teamOrder = ['0', '1', '2', '3', '4', '5', 'B', 'C', '기타'];

    useEffect(() => {
        setIsLoading(true);
        const q = query(collection(db, "payrollData"), where("year", "==", year), where("month", "==", month));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const sortedData = data.sort((a, b) => teamOrder.indexOf(a.teamId) - teamOrder.indexOf(b.teamId));
            setAllData(sortedData);
            setIsLoading(false);
        }, (error) => {
            console.error("관리자 데이터 로딩 중 오류:", error);
            setMessageBox({ message: "전체 데이터를 불러오는 데 실패했습니다. Firestore 보안 규칙을 확인하세요.", type: 'error' });
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [year, month]);
    
    return (
        <div className="bg-white p-6 rounded-xl shadow-lg mt-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{`관리자 대시보드 - ${year}년 ${month}월`}</h2>
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
                                            <th className="px-2 py-3">번호</th>
                                            <th className="px-4 py-3">이름</th>
                                            <th className="px-4 py-3">주민번호</th>
                                            <th className="px-4 py-3">지급액(세전)</th>
                                            <th className="px-4 py-3">거래은행</th>
                                            <th className="px-4 py-3">계좌번호</th>
                                            <th className="px-4 py-3">연락처</th>
                                            <th className="px-4 py-3">과목(상세)</th>
                                            <th className="px-4 py-3">내용</th>
                                            <th className="px-4 py-3">비고</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {teamData.employees.map((emp, index) => (
                                            <tr key={emp.id || index} className="bg-white border-b">
                                                <td className="px-2 py-4 text-center font-medium">{index + 1}</td>
                                                <td className="px-4 py-4">{emp.name}</td>
                                                <td className="px-4 py-4">{emp.rrn}</td>
                                                <td className="px-4 py-4">{Number(emp.grossPay).toLocaleString()} 원</td>
                                                <td className="px-4 py-4">{emp.bank}</td>
                                                <td className="px-4 py-4">{emp.accountNumber}</td>
                                                <td className="px-4 py-4">{emp.contact}</td>
                                                <td className="px-4 py-4 text-center">수학</td>
                                                <td className="px-4 py-4 text-center">{`수학${teamData.teamId}팀`}</td>
                                                <td className="px-4 py-4 w-64 whitespace-pre-wrap">{emp.remarks}</td>
                                            </tr>
                                        ))}
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
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                 // 그냥 기본 메시지 사용
            } else if (error.code === 'auth/invalid-credential') {
                 errorMessage = "이메일 또는 비밀번호가 올바르지 않습니다.";
            }
            console.error("로그인 오류:", error.code);
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
