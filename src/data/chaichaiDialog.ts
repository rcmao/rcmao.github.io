export type ChaichaiOption = {
  label: string;
  response: string;
  /** Close dialog after showing this line (e.g. goodbye). */
  close?: boolean;
  /** After this option, the hover label becomes "Chaichai". */
  revealsName?: boolean;
};

export type ChaichaiDialogTree = {
  initial: string;
  hoverTeaser: string;
  options: ChaichaiOption[];
};

export const chaichaiDialog: ChaichaiDialogTree = {
  initial: "Do you wanna know anything from me?",
  hoverTeaser: "Click to talk to me!",
  options: [
    {
      label: "Who are you?",
      response:
        "Can't you tell? I'm a Shiba Inu. My name is Chaichai, the bodyguard of Ruochen's virtual lab. You can call Ruochen my pal! 🐾",
      revealsName: true,
    },
    {
      label: "I want to hear some news about Ruochen",
      response: "Ruochen is currently seeking a PhD position. Good luck to my pal! 😎",
    },
    {
      label: "Where is the cat?",
      response:
        "Oh, you mean xiaojinzi? 🐱 She's too lazy, always napping at Ruochen's place… Me? I'm here every day, being the loyal bodyguard for my pal! 😌",
    },
    {
      label: "Here is?",
      response:
        "This is Ruochen's lab!\n• Click the computer to see Ruochen's homepage.\n• Click the iPod to play music.\n• You can also tease the fish or play with me! 🐾",
    },
    {
      label: "Never mind, bye",
      response: "Bye-bye! Stay safe! 🐾",
      close: true,
    },
  ],
};

export const CHAICHAI_NAME_STORAGE_KEY = "chaichai-dog-name-revealed";
