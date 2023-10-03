import { useAuthStore } from "./user/auth"
import { useTestStore } from "./test/pinia"
import { useMsgStore } from "./user/message"
import { useKeysStore } from "./user/keys"
 
//模块
const stores = {
    useAuthStore,
    useTestStore,
    useMsgStore,
    useKeysStore
}
 
export default stores