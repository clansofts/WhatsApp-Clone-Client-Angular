import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {ChatsService} from '../../../services/chats.service';
import {GetChat} from '../../../../graphql';
import {combineLatest} from 'rxjs';
import {Location} from '@angular/common';
import {QueryRef} from 'apollo-angular';

@Component({
  template: `
    <app-toolbar>
      <button class="navigation" mat-button (click)="goToChats()">
        <mat-icon aria-label="Icon-button with an arrow back icon">arrow_back</mat-icon>
      </button>
      <img class="profile-pic" src="assets/default-profile-pic.jpg">
      <div class="title">{{ name }}</div>
    </app-toolbar>
    <div class="container">
      <app-messages-list [items]="messages" [isGroup]="isGroup"
                         libSelectableList="multiple_press" (multiple)="deleteMessages($event)">
        <app-confirm-selection #confirmSelection></app-confirm-selection>
      </app-messages-list>
      <app-new-message (newMessage)="addMessage($event)"></app-new-message>
    </div>
  `,
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit {
  chatId: string;
  messages: GetChat.Messages[];
  name: string;
  isGroup: boolean;
  optimisticUI: boolean;
  query: QueryRef<GetChat.Query>;

  constructor(private route: ActivatedRoute,
              private router: Router,
              private location: Location,
              private chatsService: ChatsService) {
  }

  ngOnInit() {
    combineLatest(this.route.params, this.route.queryParams,
      (params: { id: string }, queryParams: { oui?: boolean }) => ({params, queryParams}))
      .subscribe(({params: {id: chatId}, queryParams: {oui}}) => {
        this.chatId = chatId;

        this.optimisticUI = oui;

        if (this.optimisticUI) {
          // We are using fake IDs generated by the Optimistic UI
          this.chatsService.addChat$.subscribe(({data: {addChat, addGroup}}) => {
            this.chatId = addChat ? addChat.id : addGroup.id;
            console.log(`Switching from the Optimistic UI id ${chatId} to ${this.chatId}`);
            // Rewrite the URL
            this.location.go(`chat/${this.chatId}`);
            // Optimistic UI no more
            this.optimisticUI = false;
          });
        }

        const {query$, chat$} = this.chatsService.getChat(chatId, this.optimisticUI);

        query$.subscribe(query => this.query = query);

        chat$.subscribe(chat => {
          this.messages = chat.messageFeed.messages;
          this.name = chat.name;
          this.isGroup = chat.isGroup;
        });
      });
  }

  goToChats() {
    this.router.navigate(['/chats']);
  }

  addMessage(content: string) {
    this.chatsService.addMessage(this.chatId, content).subscribe();
    this.chatsService.moreMessages(this.query, this.chatId);
  }

  deleteMessages(messageIds: string[]) {
    this.chatsService.removeMessages(this.chatId, this.messages, messageIds).subscribe();
  }
}
