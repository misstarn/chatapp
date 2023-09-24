import { useAuthStore } from "./user/auth"
import { useTestStore } from "./test/pinia"
import { useMsgStore } from "./user/msg"
 
//模块
const stores = {
    useAuthStore,
    useTestStore,
    useMsgStore
}
 
export default stores