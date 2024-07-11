<script setup>
import { VBottomSheet } from 'vuetify/labs/VBottomSheet'
import { VDatePicker } from 'vuetify/labs/VDatePicker'
import { VInfiniteScroll } from 'vuetify/labs/VInfiniteScroll'
console.log('detail')
const items = [
    {
        title: 'Home',
        disabled: false,
        href: '/',
    },
    {
        title: 'Blog',
        disabled: false,
        href: '/blog',
    },
    {
        title: 'Blog post',
        disabled: true,
        href: '/',
    },
]
</script>

<template>
    <div class="p-8 max-w-[1200px] mx-auto">
        <v-snackbar v-model="snackbar" :timeout="timeout">
            {{ snackbarText }}

            <template v-slot:actions>
                <v-btn color="blue" variant="text" @click="snackbar = false">
                    Close
                </v-btn>
            </template>
        </v-snackbar>
        <!-- part 1 -->
        <div class="w-full mb-8 rounded-md">
            <div class="px-8 bg-[#ecf2ff] flex justify-between items-center">
                <div>
                    <h3 class="text-xl font-bold mb-2">Blog Detail</h3>
                    <v-breadcrumbs class="pl-0 py-0" :items="items" divider="."></v-breadcrumbs>
                </div>
                <div class="py-0 overflow-hidden">
                    <div class="-mb-16 mt-3">
                        <img src="/imgs/ChatBc.png" alt="breadcrumb">
                    </div>
                </div>
            </div>
        </div>
        <!-- part 2 main -->
        <v-card class="elevation-10">
            <v-img class="h-[440px] items-end text-right" cover
                src="https://modernize-nuxt.adminmart.com/images/blog/blog-img9.jpg">
                <v-card-item style="padding: 30px 30px 24px;">
                    <v-chip>2240</v-chip>
                </v-card-item>
            </v-img>
            <v-avatar size="40" class="-mt-7 mx-6" image="/imgs/user-2.jpg"></v-avatar>
            <v-card-item class="px-6 pt-4" style="padding: 30px 30px 24px;">
                <v-chip size="small">Gadget</v-chip>
                <h5 class=" text-4xl my-6">
                    <nuxt-link>Early Black Friday Amazon deals: cheap TVs, headphones</nuxt-link>
                </h5>
                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <div class="flex items-center">
                            <v-avatar class="" style="width: 18px; height: 18px;">
                                <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-eye"
                                    width="24px" height="24px" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
                                    fill="none" stroke-linecap="round" stroke-linejoin="round">
                                    <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                                    <circle cx="12" cy="12" r="2"></circle>
                                    <path
                                        d="M22 12c-2.667 4.667 -6 7 -10 7s-7.333 -2.333 -10 -7c2.667 -4.667 6 -7 10 -7s7.333 2.333 10 7">
                                    </path>
                                </svg>
                            </v-avatar>
                            <span class="ml-2 text-sm">2250</span>
                        </div>
                        <div class="flex items-center">
                            <v-avatar class=" ml-6" style="width: 18px; height: 18px;">
                                <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-message-2"
                                    width="24px" height="24px" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
                                    fill="none" stroke-linecap="round" stroke-linejoin="round">
                                    <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                                    <path
                                        d="M12 20l-3 -3h-2a3 3 0 0 1 -3 -3v-6a3 3 0 0 1 3 -3h10a3 3 0 0 1 3 3v6a3 3 0 0 1 -3 3h-2l-3 3">
                                    </path>
                                    <line x1="8" y1="9" x2="16" y2="9"></line>
                                    <line x1="8" y1="13" x2="14" y2="13"></line>
                                </svg>
                            </v-avatar>
                            <span class="ml-2 text-sm">5</span>
                        </div>
                    </div>
                    <div class="flex items-center">
                        <v-avatar class="" style="width: 10px; height: 10px;">
                            <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-circle" width="24px"
                                height="24px" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none"
                                stroke-linecap="round" stroke-linejoin="round">
                                <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                                <circle cx="12" cy="12" r="9"></circle>
                            </svg>
                        </v-avatar>
                        <span class="ml-2 text-sm">Sun, Oct 1</span>
                    </div>
                </div>
            </v-card-item>
            <hr>
            <div class="p-6">
                Title of the paragraph
                But you cannot figure out what it is or what it can do. MTA web directory is the simplest way in which one
                can bid on a link, or a few links if they wish to do so. The link directory on MTA displays all of the links
                it currently has, and does so in alphabetical order, which makes it much easier for someone to find what
                they are looking for if it is something specific and they do not want to go through all the other sites and
                links as well. It allows you to start your bid at the bottom and slowly work your way to the top of the
                list.

                Gigure out what it is or what it can do. MTA web directory is the simplest way in which one can bid on a
                link, or a few links if they wish to do so. The link directory on MTA displays all of the links it currently
                has, and does so in alphabetical order, which makes it much easier for someone to find what they are looking
                for if it is something specific and they do not want to go through all the other sites and links as well. It
                allows you to start your bid at the bottom and slowly work your way to the top of the

                This is strong text.

                This is italic text.
            </div>
        </v-card>
        <!-- 评论 -->
        <v-card class="pa-6 mt-6 elevation-10">
            <div>
                <div class="flex mb-4 items-center gap-3">
                    <v-avatar size="40" image="/imgs/user-2.jpg"></v-avatar>
                    <v-text-field density="compact" label="comment" color="info" single-line hide-details
                        variant="outlined"></v-text-field>
                    <v-btn variant="tonal" color="info" size="large" class="lowercase">评论</v-btn>
                </div>
            </div>
            <hr class="my-2">
            <h3 class=" text-xl mb-6">
                Comments
                <v-chip color="info">3</v-chip>
            </h3>
            <div v-for="i in 4">
                <v-card class="pa-5 mb-5 border-light rounded-md elevation-10">
                    <!-- 头像 -->
                    <div class="flex gap-3 items-center">
                        <v-avatar size="30" image="/imgs/user-2.jpg"></v-avatar>
                        <div class="flex items-center gap-3">
                            <h6 class="text-base">Nettie Fletcher</h6>
                            <span class="opacity-50 text-xs inline-flex items-center">
                                <svg data-v-1f0508b3="" xmlns="http://www.w3.org/2000/svg"
                                    class="icon icon-tabler icon-tabler-circle opacity-50 mr-1" width="8px" height="8px"
                                    viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="inherit"
                                    stroke-linecap="round" stroke-linejoin="round">
                                    <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                                    <circle cx="12" cy="12" r="9"></circle>
                                </svg>
                                Thu, Mar 23
                            </span>
                        </div>
                    </div>
                    <!-- 内容 -->
                    <div class="py-3 text-sm">
                        To iforug gartupowu vel pinzih mibavaiv oc cespik utji zujan hi konbi ka cudzal gegwu feibpi.
                        Kesmukso likdoore tiscowvi lijzah os cimedel tavo lu if nuscunul decaw nulek tijhisa wuwlaege go gi
                        nil.
                    </div>
                    <div class="flex my-1 items-center gap-3">
                        <v-btn style="text-transform: capitalize; letter-spacing: 0px;" size="small" color="info"
                            variant="tonal" icon>
                            <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-arrow-back-up"
                                width="16px" height="16px" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
                                fill="none" stroke-linecap="round" stroke-linejoin="round">
                                <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                                <path d="M9 13l-4 -4l4 -4m-4 4h11a4 4 0 0 1 0 8h-1"></path>
                            </svg>
                            <v-tooltip size="small" activator="parent" location="top">Reply</v-tooltip>
                        </v-btn>
                    </div>
                </v-card>
                <div class="ml-5">
                    <v-card class="pa-5 mb-5 border-light rounded-md elevation-10">
                        <!-- 头像 -->
                        <div class="flex gap-3 items-center">
                            <v-avatar size="30" image="/imgs/user-2.jpg"></v-avatar>
                            <div class="flex items-center gap-3">
                                <h6 class="text-base">Nettie Fletcher</h6>
                                <span class="opacity-50 text-xs inline-flex items-center">
                                    <svg data-v-1f0508b3="" xmlns="http://www.w3.org/2000/svg"
                                        class="icon icon-tabler icon-tabler-circle opacity-50 mr-1" width="8px" height="8px"
                                        viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="inherit"
                                        stroke-linecap="round" stroke-linejoin="round">
                                        <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                                        <circle cx="12" cy="12" r="9"></circle>
                                    </svg>
                                    Thu, Mar 23
                                </span>
                            </div>
                        </div>
                        <!-- 内容 -->
                        <div class="py-3 text-sm">
                            To iforug gartupowu vel pinzih mibavaiv oc cespik utji zujan hi konbi ka cudzal gegwu feibpi.
                            Kesmukso likdoore tiscowvi lijzah os cimedel tavo lu if nuscunul decaw nulek tijhisa wuwlaege go
                            gi nil.
                        </div>
                    </v-card>
                    <div>
                        <div class="flex mb-4 items-center gap-3">
                            <v-avatar  rounded="0" size="40" image="/imgs/user-2.jpg"></v-avatar>
                            <v-text-field density="compact" label="comment" color="info" single-line hide-details
                                variant="outlined"></v-text-field>
                            <v-btn variant="tonal" color="info" size="large" class="lowercase">回复</v-btn>
                        </div>
                    </div>
                </div>
            </div>
        </v-card>
    </div>
</template>

<style>
.elevation-10 {
    box-shadow: 0 0 2px #919eab4d, 0 12px 24px -4px #919eab1f !important;
}</style>