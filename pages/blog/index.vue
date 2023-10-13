<script setup>
import { VBottomSheet } from 'vuetify/labs/VBottomSheet'
import { VDatePicker } from 'vuetify/labs/VDatePicker'
import { VInfiniteScroll } from 'vuetify/labs/VInfiniteScroll'

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
                    <h3 class="text-xl font-bold mb-2">Blog app</h3>
                    <a href="/">Get the latest news</a>
                </div>
                <div class="py-0 overflow-hidden">
                    <div class="-mb-16 mt-3">
                        <img src="../public/imgs/ChatBc.png" alt="breadcrumb">
                    </div>
                </div>
            </div>
        </div>
        <!-- part 2 main -->
        <v-row>
            <v-col cols="8">
                <v-card class="">
                    <v-img gradient="to bottom, rgba(0,0,0,.1), rgba(0,0,0,.5)" cover height="400"
                        src="https://modernize-nuxt.adminmart.com/images/blog/blog-img9.jpg">
                        <div class="p-6 flex justify-between flex-col h-[400px] relative">
                            <div class="flex justify-between items-center">
                                <v-avatar size="40" image="/imgs/user-2.jpg"></v-avatar>
                                <v-chip size="small">
                                    Gadget
                                </v-chip>
                            </div>
                            <div>
                                <div class="text-2xl my-6 text-white">Early Black Friday Amazon deals: cheap TVs, headphones
                                </div>
                                <div class="flex items-center justify-between text-white">
                                    <div class="flex items-center">
                                        <div class="flex items-center">
                                            <v-avatar class="text-white" style="width: 18px; height: 18px;">
                                                <svg xmlns="http://www.w3.org/2000/svg"
                                                    class="icon icon-tabler icon-tabler-eye" width="24px" height="24px"
                                                    viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none"
                                                    stroke-linecap="round" stroke-linejoin="round">
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
                                            <v-avatar class="text-white ml-6" style="width: 18px; height: 18px;">
                                                <svg xmlns="http://www.w3.org/2000/svg"
                                                    class="icon icon-tabler icon-tabler-message-2" width="24px"
                                                    height="24px" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
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
                                        <v-avatar class="text-white" style="width: 10px; height: 10px;">
                                            <svg xmlns="http://www.w3.org/2000/svg"
                                                class="icon icon-tabler icon-tabler-circle" width="24px" height="24px"
                                                viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none"
                                                stroke-linecap="round" stroke-linejoin="round">
                                                <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                                                <circle cx="12" cy="12" r="9"></circle>
                                            </svg>
                                        </v-avatar>
                                        <span class="ml-2 text-sm">Sun, Oct 1</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </v-img>

                </v-card>
            </v-col>
            <v-col cols="4">
                <v-card class="">
                    <v-img gradient="to bottom, rgba(0,0,0,.1), rgba(0,0,0,.5)" cover height="400"
                        src="https://modernize-nuxt.adminmart.com/images/blog/blog-img9.jpg">
                        <div class="p-6 flex justify-between flex-col h-[400px] relative">
                            <div class="flex justify-between items-center">
                                <v-avatar size="40" image="/imgs/user-2.jpg"></v-avatar>
                                <v-chip size="small" >
                                    Gadget
                                </v-chip>
                            </div>
                            <div>
                                <div class="text-2xl my-6 text-white">Early Black Friday Amazon deals: cheap TVs, headphones
                                </div>
                                <div class="flex items-center justify-between text-white">
                                    <div class="flex items-center">
                                        <div class="flex items-center">
                                            <v-avatar class="text-white" style="width: 18px; height: 18px;">
                                                <svg xmlns="http://www.w3.org/2000/svg"
                                                    class="icon icon-tabler icon-tabler-eye" width="24px" height="24px"
                                                    viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none"
                                                    stroke-linecap="round" stroke-linejoin="round">
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
                                            <v-avatar class="text-white ml-6" style="width: 18px; height: 18px;">
                                                <svg xmlns="http://www.w3.org/2000/svg"
                                                    class="icon icon-tabler icon-tabler-message-2" width="24px"
                                                    height="24px" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
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
                                        <v-avatar class="text-white" style="width: 10px; height: 10px;">
                                            <svg xmlns="http://www.w3.org/2000/svg"
                                                class="icon icon-tabler icon-tabler-circle" width="24px" height="24px"
                                                viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none"
                                                stroke-linecap="round" stroke-linejoin="round">
                                                <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                                                <circle cx="12" cy="12" r="9"></circle>
                                            </svg>
                                        </v-avatar>
                                        <span class="ml-2 text-sm">Sun, Oct 1</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </v-img>

                </v-card>
            </v-col>
            <v-col cols="4" v-for="i in 6">
                <v-card>
                    <div>
                        <nuxt-link href="">
                            <v-img class="items-end text-right"
                                cover
                                src="https://modernize-nuxt.adminmart.com/images/blog/blog-img3.jpg">
                                <v-card-item style="padding: 30px 30px 24px;">
                                    <v-chip size="small">2 min read</v-chip>
                                </v-card-item>
                            </v-img>
                        </nuxt-link>
                        <v-avatar size="40" class="-mt-7 mx-6" image="/imgs/user-2.jpg"></v-avatar>
                    </div>
                    <v-card-item class="px-6 pt-4" style="padding: 30px 30px 24px;">
                        <v-chip size="small">Gadget</v-chip>
                        <h5 class=" text-lg my-6">
                            <nuxt-link>Apple is apparently working on a new ‘streamlined’ accessibility</nuxt-link>
                        </h5>
                        <div class="flex items-center justify-between">
                            <div class="flex items-center">
                                <div class="flex items-center">
                                    <v-avatar class="" style="width: 18px; height: 18px;">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-eye"
                                            width="24px" height="24px" viewBox="0 0 24 24" stroke-width="2"
                                            stroke="currentColor" fill="none" stroke-linecap="round"
                                            stroke-linejoin="round">
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
                                        <svg xmlns="http://www.w3.org/2000/svg"
                                            class="icon icon-tabler icon-tabler-message-2" width="24px" height="24px"
                                            viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none"
                                            stroke-linecap="round" stroke-linejoin="round">
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
                                    <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-circle"
                                        width="24px" height="24px" viewBox="0 0 24 24" stroke-width="2"
                                        stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                        <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                                        <circle cx="12" cy="12" r="9"></circle>
                                    </svg>
                                </v-avatar>
                                <span class="ml-2 text-sm">Sun, Oct 1</span>
                            </div>
                        </div>
                    </v-card-item>
                </v-card>
            </v-col>
        </v-row>
    </div>
</template>